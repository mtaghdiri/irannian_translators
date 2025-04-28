{
	"translatorID": "ac27bfc1-c31a-4329-a3c4-7de01b99f5dc",
	"label": "molapub.ir",
	"creator": "amirhosein",
	"target": "https://www.molapub.ir/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-04-28 09:49:21"
}

 function detectWeb(doc, url) {
	Zotero.debug("MolaPub: Running detectWeb for URL: " + url);

	// اول صفحات کتاب تکی را چک کن
	if (/\/products\/\d+\//.test(url)) {
		Zotero.debug("MolaPub: Detected book page (single)");
		return "book";
	}

	// سپس صفحات چندتایی یا صفحه اصلی را چک کن
	if (/\/products\/category\//.test(url) || 
		/\/products\/?$/.test(url) || 
		/^(https?:\/\/)?(www\.)?molapub\.ir\/?$/.test(url)) {
		Zotero.debug("MolaPub: Detected archive or home page (multiple)");
		return "multiple";
	}

	Zotero.debug("MolaPub: No relevant page detected");
	return false;
}
 function doWeb(doc, url) {
	Zotero.debug("MolaPub: Starting doWeb");

	let type =  detectWeb(doc, url);
	Zotero.debug(`MolaPub: detectWeb returned: ${type}`);

	if (type === "multiple") {
		 processMultiple(doc, url);
	} else {
		 scrapeBookPage(doc, url);
	}
}
 function processMultiple(doc, url) {
	console.log("SALAM");
	let items = {};

	let loopLinks = doc.querySelectorAll("a.image-link");
	for (let link of loopLinks) {
		let href = link.getAttribute("href");
		if (!href || !href.includes("/products/")) continue;

		let fullHref = new URL(href, url).href;

		// پیدا کردن mat-card والد و گرفتن عنوان از a.title.text-truncate
		let matCard = link.closest("mat-card");
		let title = matCard?.querySelector("a.title.text-truncate")?.textContent.trim();

		// اگر title پیدا نشد، fallback به متن خود لینک یا fullHref
		if (!title) title = link.textContent.trim() || fullHref;

		items[fullHref] = title;
	}

	console.log("آیتم‌ها شناسایی شده:", items); // نمایش آیتم‌ها

	if (Object.keys(items).length > 0) {
		Zotero.selectItems(items, function(selectedItems) {
			if (!selectedItems) return;
			let urls = Object.keys(selectedItems);
			ZU.processDocuments(urls, scrapeBookPage);
		});
	} else {
		console.log("هیچ آیتمی برای ذخیره‌سازی پیدا نشد.");
	}
}



 function scrapeBookPage(doc, url) {
	Zotero.debug("MolaPub: Scraping book page: " + url);

	let newItem = new Zotero.Item("book");

	// عنوان کتاب
	let titleElement = doc.querySelector(
		'h2, ' +
		'a.title.text-truncate, ' +
		'app-breadcrumb mat-card div:nth-child(2) span b, ' +
		'app-breadcrumb mat-card div:nth-child(3) span b, ' +
		'#mat-tab-content-2-0 div app-products-carousel div div div mat-card a.title.text-truncate, ' +
		'#mat-tab-content-2-0 div app-products-carousel div div div.swiper-slide.ng-star-inserted.swiper-slide-next mat-card a.title.text-truncate'
	);
	if (titleElement) {
		let rawTitle = titleElement.textContent.trim();
		newItem.title = rawTitle.split('/')[0].trim();
		Zotero.debug("MolaPub: Title found: " + newItem.title);
	} else {
		newItem.title = "Untitled Book";
	}

	// گرفتن تمام td ها
	let tdElements = doc.querySelectorAll('td');

	// نویسنده
	let authorElement = Array.from(doc.querySelectorAll('th')).find(th => th.textContent.includes("نویسنده"))?.nextElementSibling;
	if (authorElement) {
		newItem.creators.push(ZU.cleanAuthor(authorElement.textContent.trim(), "author"));
	} else if (tdElements[0]) {
		newItem.creators.push(ZU.cleanAuthor(tdElements[0].textContent.trim(), "author"));
	}

	// مترجم
	let translatorElement = Array.from(doc.querySelectorAll('th')).find(th => th.textContent.includes("مترجم"))?.nextElementSibling;
	if (translatorElement) {
		newItem.creators.push(ZU.cleanAuthor(translatorElement.textContent.trim(), "translator"));
	} else if (tdElements[1]) {
		newItem.creators.push(ZU.cleanAuthor(tdElements[1].textContent.trim(), "translator"));
	}

	// دسته‌بندی (برچسب)
	let categoryElement = Array.from(doc.querySelectorAll('th')).find(th => th.textContent.includes("دسته"))?.nextElementSibling;
	if (categoryElement) {
		newItem.tags.push(categoryElement.textContent.trim());
	} else if (tdElements[2]) {
		newItem.tags.push(tdElements[2].textContent.trim());
	}

	// ناشر
	let publisherElement = Array.from(doc.querySelectorAll('th')).find(th => th.textContent.includes("ناشر"))?.nextElementSibling;
	if (publisherElement) {
		newItem.publisher = publisherElement.textContent.trim();
	} else if (tdElements[3]) {
		newItem.publisher = tdElements[3].textContent.trim();
	}

	// تعداد صفحات
	let pagesElement = Array.from(doc.querySelectorAll('th')).find(th => th.textContent.includes("تعداد صفحات"))?.nextElementSibling;
	if (pagesElement) {
		newItem.numPages = pagesElement.textContent.trim();
	} else if (tdElements[4]) {
		newItem.numPages = tdElements[4].textContent.trim();
	}

	// قیمت (به عنوان یادداشت)
	let price = doc.evaluate('//*[@id="app"]/app-pages/mat-sidenav-container/mat-sidenav-content/div[1]/app-product/div[1]/div[2]/div[5]/h2', doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
	if (price) {
		newItem.notes.push({ note: "قیمت: " + price.textContent.trim() });
	}

	// URL
	newItem.url = url;

	// تصویر جلد (اگر Base64 باشد)
	let imgElement = doc.querySelector('img');
	if (imgElement) {
		let imgSrc = imgElement.getAttribute('src');
		if (imgSrc && imgSrc.startsWith('data:image')) {
			newItem.attachments.push({
				title: "Book cover",
				mimeType: "image/jpeg", 
				url: imgSrc,
				snapshot: false
			});
		}
	}

	Zotero.debug("MolaPub: Completing item...");
	newItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
