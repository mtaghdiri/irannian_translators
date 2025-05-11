{
	"translatorID": "aa8495d1-181e-4f8b-9521-f3f66ed3100b",
	"label": "PersianPdf",
	"creator": "MohammadHossein",
	"target": "",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-05-10 11:10:21"
}


function detectWeb(doc, url) {
	Zotero.debug("Checking item type...");

	if (url.includes("/book/")) {
		Zotero.debug("من کتاب هستم");
		return "book";
	}

	if (url.includes("/book-category/") || 
		url.includes("/?s=") ||
		url.includes("/writer/")) {
		return "multiple";
	}

	let title = ZU.xpathText(
		doc,
		"//*[@id='page-content']/section[1]/div[2]/div/div[2]/div/div/table/tbody/tr[1]/td[2]"
	);
	if (title) {
		return "book";
	}
	return false;
}

function doWeb(doc, url) {
	Zotero.debug("doWeb function called.");
	let result = detectWeb(doc, url);

	if (result === "book") {
		scrapeBookPage(doc, url);
	} else if (result === "multiple") {
		processMultiple(doc, url);
	}
}

function splitName(name) {
	let parts = name.trim().split(/\s+/);
	if (parts.length === 1) {
		return { firstName: "", lastName: parts[0] };
	}
	return {
		firstName: parts.slice(0, -1).join(" "),
		lastName: parts[parts.length - 1]
	};
}

function scrapeBookPage(doc, url) {
	Zotero.debug("Scraping book page...");

	let item = new Zotero.Item("book");

	// Title
	item.title = ZU.xpathText(
		doc,
		"//*[@id='page-content']/section[1]/div[2]/div/div[2]/div/div/table/tbody/tr[1]/td[2]"
	);
	if (!item.title) {
		throw new Error("عنوان کتاب پیدا نشد.");
	}

	// Authors
	let authorText = ZU.xpathText(
		doc,
		"//*[@id='page-content']/section[1]/div[2]/div/div[2]/div/div/table/tbody/tr[2]/td[2]"
	);
	if (authorText) {
		let authors = authorText.split(/,|،/).map(name => name.trim()).filter(name => name);
		authors.forEach(author => {
			let { firstName, lastName } = splitName(author);
			item.creators.push({
				firstName: firstName,
				lastName: lastName,
				creatorType: "author",
				fieldMode: 0
			});
		});
	}

	// Translators
	let translatorText = ZU.xpathText(
		doc,
		"//*[@id='page-content']/section[1]/div[2]/div/div[2]/div/div/table/tbody/tr[3]/td[2]"
	);
	if (translatorText) {
		let translators = translatorText.split(/,|،/).map(name => name.trim()).filter(name => name);
		translators.forEach(translator => {
			let { firstName, lastName } = splitName(translator);
			item.creators.push({
				firstName: firstName,
				lastName: lastName,
				creatorType: "translator",
				fieldMode: 0
			});
		});
	}

	// Publisher
	item.publisher = ZU.xpathText(
		doc,
		"//*[@id='page-content']/section[1]/div[2]/div/div[2]/div/div/table/tbody/tr[4]/td[2]/a"
	);

	// Date
	item.date = ZU.xpathText(
		doc,
		"//*[@id='page-content']/section[1]/div[2]/div/div[2]/div/div/table/tbody/tr[5]/td[2]"
	);

	// Number of Pages
	let numPages = ZU.xpathText(
		doc,
		"//*[@id='page-content']/section[1]/div[2]/div/div[2]/div/div/table/tbody/tr[6]/td[2] | //*[@id='page-content']/section[1]/div[2]/div/div[2]/div/div/table/tbody/tr[7]/td[2]"
	);
	if (numPages) {
		item.numPages = numPages.replace(/[^\d]/g, ""); // Extract digits only
	}

	// Categories (for tags)
		let categoryLinks = ZU.xpath(
		doc,
		"//*[@id='page-content']/section[1]//div[contains(@class, 'w-hwrapper')]//a[contains(@class, 'w-btn') and contains(@href, '/book-category/')]"
	);
	const tagBlacklist = ["حامی شما میشوم", "درخواست حذف", item.title, "دانلود", "گزارش مشکل"];
	if (categoryLinks) {
		categoryLinks.forEach(link => {
			let category = link.textContent.trim();
			if (category && !tagBlacklist.includes(category)) {
				item.tags.push(category);
			}
		});
	}

	// Description (for notes)
	let description = ZU.xpathText(
		doc,
		"//*[@id='page-content']/section[2]/div/div/div[2]/div[2]"
	);
	if (description) {
		item.notes.push({ note: description.trim() });
	}

	// PDF Attachment
	let pdfUrl = ZU.xpathText(doc, "//*[@id='download']/div/div[4]/a/@href");
	if (pdfUrl) {
		if (!pdfUrl.startsWith("http")) {
			pdfUrl = new URL(pdfUrl, url).href;
		}
		item.attachments.push({
			title: "Full Text PDF",
			mimeType: "application/pdf",
			url: pdfUrl,
			snapshot: true
		});
	}

	// Cover Image
	let coverImg = ZU.xpath(
		doc,
		"//*[@id='page-content']/section[1]/div[2]/div/div[1]/div/div/div/img"
	)[0];
	if (coverImg && coverImg.src) {
		let imageUrl = coverImg.src;
		if (!imageUrl.startsWith("http")) {
			imageUrl = new URL(imageUrl, url).href;
		}
		item.attachments.push({
			title: "Book Cover",
			mimeType: "image/jpeg",
			url: imageUrl,
			snapshot: true
		});
	}

	item.url = url;
	Zotero.debug("Item is ready to be saved.");
	item.complete();
}

function processMultiple(doc, url) {
	let items = {};
	let bookLinks = doc.evaluate(
		"//a[contains(@href, '/book/')]",
		doc,
		null,
		XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
		null
	);

	for (let i = 0; i < bookLinks.snapshotLength; i++) {
		let link = bookLinks.snapshotItem(i).getAttribute("href");
		let fullLink = new URL(link, url).href;
		let title = bookLinks.snapshotItem(i).textContent.trim().replace(/^دانلود کتاب\s+/, "");
		items[fullLink] = title || `Book ${i + 1}`;
	}

	Zotero.selectItems(items, function(selectedItems) {
		if (!selectedItems) return;
		let urls = Object.keys(selectedItems);
		ZU.processDocuments(urls, scrapeBookPage);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://persianpdf.com/book/%D8%AF%D8%A7%D9%86%D9%84%D9%88%D8%AF-%DA%A9%D8%AA%D8%A7%D8%A8-%D8%A7%D8%B5%D9%88%D9%84-%D9%85%D8%B0%D8%A7%DA%A9%D8%B1%D9%87-%D8%A7%D8%AB%D8%B1-%D8%B1%D9%88%DB%8C-%D8%AC%DB%8C-%D9%84%D9%88%DB%8C%DA%A9/",
		"items": [
			{
				"itemType": "book",
				"title": "اصول مذاکره",
				"creators": [
					{
						"firstName": "روی جی",
						"lastName": "لویک",
						"creatorType": "author",
						"fieldMode": 0
					},
					{
						"firstName": "راجر",
						"lastName": "فیشر",
						"creatorType": "author",
						"fieldMode": 0
					},
					{
						"firstName": "محمدابراهیم",
						"lastName": "گوهریان",
						"creatorType": "translator",
						"fieldMode": 0
					},
					{
						"firstName": "مهدی",
						"lastName": "قراچه داغی",
						"creatorType": "translator",
						"fieldMode": 0
					}
				],
				"date": "1398",
				"libraryCatalog": "PersianPdf",
				"numPages": "272",
				"publisher": "نشر نوین",
				"url": "https://persianpdf.com/book/%D8%AF%D8%A7%D9%86%D9%84%D9%88%D8%AF-%DA%A9%D8%AA%D8%A7%D8%A8-%D8%A7%D8%B5%D9%88%D9%84-%D9%85%D8%B0%D8%A7%DA%A9%D8%B1%D9%87-%D8%A7%D8%AB%D8%B1-%D8%B1%D9%88%DB%8C-%D8%AC%DB%8C-%D9%84%D9%88%DB%8C%DA%A9/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Book Cover",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					"روانشناسی",
					"سبک زندگی و موفقیت"
				],
				"notes": [
					{
						"note": "کتاب اصول مذاکره نوشته روی جی لویک یکی از بهترین کتاب‌های آموزشی در زمینه مذاکره است..."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://persianpdf.com/book/%D8%AF%D8%A7%D9%86%D9%84%D9%88%D8%AF-%DA%A9%D8%AA%D8%A7%D8%A8-%D8%A7%D8%B1%D9%85%D8%BA%D8%A7%D9%86-%D9%85%D9%88%D8%B1-%D8%A7%D8%AB%D8%B1-%D8%B4%D8%A7%D9%87%D8%B1%D8%AE-%D9%85%D8%B3%DA%A9%D9%88%D8%A8/",
		"items": [
			{
				"itemType": "book",
				"title": "ارمغان مور",
				"creators": [
					{
						"firstName": "شاهرخ",
						"lastName": "مسکوب",
						"creatorType": "author",
						"fieldMode": 0
					}
				],
				"date": "1384",
				"libraryCatalog": "PersianPdf",
				"numPages": "160",
				"publisher": "نشر نی",
				"url": "https://persianpdf.com/book/%D8%AF%D8%A7%D9%86%D9%84%D9%88%D8%AF-%DA%A9%D8%AA%D8%A7%D8%A8-%D8%A7%D8%B1%D9%85%D8%BA%D8%A7%D9%86-%D9%85%D9%88%D8%B1-%D8%A7%D8%AB%D8%B1-%D8%B4%D8%A7%D9%87%D8%B1%D8%AE-%D9%85%D8%B3%DA%A9%D9%88%D8%A8/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Book Cover",
						"mimeType": "image/jpeg"
					}
				],
				"tags": ["ادبیات"],
				"notes": [
					{
						"note": "کتاب ارمغان مور نوشته شاهرخ مسکوب..."
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://persianpdf.com/book/%D8%AF%D8%A7%D9%86%D9%84%D9%88%D8%AF-%DA%A9%D8%AA%D8%A7%D8%A8-%D8%A8%D8%B9%D8%AB%D8%AA-%D8%A7%D8%AB%D8%B1-%D9%85%D9%87%D8%AF%DB%8C-%D8%A8%D8%A7%D8%B2%D8%B1%DA%AF%D8%A7%D9%86/",
		"items": [
			{
				"itemType": "book",
				"title": "بعثت",
				"creators": [
					{
						"firstName": "مهدی",
						"lastName": "بازرگان",
						"creatorType": "author",
						"fieldMode": 0
					}
				],
				"date": "1345",
				"libraryCatalog": "PersianPdf",
				"numPages": "120",
				"publisher": "انتشارات قلم",
				"url": "https://persianpdf.com/book/%D8%AF%D8%A7%D9%86%D9%84%D9%88%D8%AF-%DA%A9%D8%AA%D8%A7%D8%A8-%D8%A8%D8%B9%D8%AB%D8%AA-%D8%A7%D8%AB%D8%B1-%D9%85%D9%87%D8%AF%DB%8C-%D8%A8%D8%A7%D8%B2%D8%B1%DA%AF%D8%A7%D9%86/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Book Cover",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					"مذهبی"
				],
				"notes": [
					{
						"note": "کتاب بعثت نوشته مهدی بازرگان به بررسی موضوع بعثت پیامبر اسلام می‌پردازد و یکی از آثار مهم در زمینه مطالعات دینی است..."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://persianpdf.com/book/%D8%AF%D8%A7%D9%86%D9%84%D9%88%D8%AF-%DA%A9%D8%AA%D8%A7%D8%A8-%D8%A7%D8%B5%D9%88%D9%84-%D9%85%D8%B0%D8%A7%DA%A9%D8%B1%D9%87-%D8%A7%D8%AB%D8%B1-%D8%B1%D9%88%DB% конструкции",
		"items": [
			{
				"itemType": "book",
				"title": "اصول مذاکره",
				"creators": [
					{
						"firstName": "روی جی",
						"lastName": "لویک",
						"creatorType": "author",
						"fieldMode": 0
					},
					{
						"firstName": "راجر",
						"lastName": "فیشر",
						"creatorType": "author",
						"fieldMode": 0
					},
					{
						"firstName": "محمدابراهیم",
						"lastName": "گوهریان",
						"creatorType": "translator",
						"fieldMode": 0
					},
					{
						"firstName": "مهدی",
						"lastName": "قراچه داغی",
						"creatorType": "translator",
						"fieldMode": 0
					}
				],
				"date": "1398",
				"libraryCatalog": "PersianPdf",
				"numPages": "272",
				"publisher": "نشر نوین",
				"url": "https://persianpdf.com/book/%D8%AF%D8%A7%D9%86%D9%84%D9%88%D8%AF-%DA%A9%D8%AA%D8%A7%D8%A8-%D8%A7%D8%B5%D9%88%D9%84-%D9%85%D8%B0%D8%A7%DA%A9%D8%B1%D9%87-%D8%A7%D8%AB%D8%B1-%D8%B1%D9%88%DB%8C-%D8%AC%DB%8C-%D9%84%D9%88%DB%8C%DA%A9/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Book Cover",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					"روانشناسی",
					"سبک زندگی و موفقیت"
				],
				"notes": [
					{
						"note": "کتاب اصول مذاکره نوشته روی جی لویک یکی از بهترین کتاب‌های آموزشی در زمینه مذاکره است..."
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
