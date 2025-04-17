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
	"lastUpdated": "2025-03-09 12:06:55"
}

function detectWeb(doc, url) {
  Zotero.debug("Checking item type...");

  if (url.includes("/book/")) {
	Zotero.debug("من کتاب هستم");
	return "book";
  }

  if (url.includes("/book-category/")|| 
	  url.includes("/?s=") ||
	  url.includes("/writer/")) {
	return "multiple";
  }

  let title = ZU.xpathText(
	doc,"//*[@id='page-content']/section[1]/div[2]/div/div[2]/div/div/table/tbody/tr[1]/td[2]");
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
	processMultiple(doc);
  }
}

function scrapeBookPage(doc, url) {
  Zotero.debug("Scraping book page...");

  let item = new Zotero.Item("book");

  item.title = ZU.xpathText(
	doc,
	"//*[@id='page-content']/section[1]/div[2]/div/div[2]/div/div/table/tbody/tr[1]/td[2]"
  );
  if (!item.title) {
	throw new Error("عنوان کتاب پیدا نشد.");
  }

  let author = ZU.xpathText(
	doc,
	"//*[@id='page-content']/section[1]/div[2]/div/div[2]/div/div/table/tbody/tr[2]/td[2]/a"
  );
  if (author) {
	item.creators.push({
	  firstName: "",
	  lastName: author,
	  creatorType: "author",
	  fieldMode: 1 
	  // dead year
	});
  }

  item.publisher = ZU.xpathText(
	doc,
	"//*[@id='page-content']/section[1]/div[2]/div/div[2]/div/div/table/tbody/tr[3]/td[2]/a"
  );

  item.date = ZU.xpathText(
	doc,
	"//*[@id='page-content']/section[1]/div[2]/div/div[2]/div/div/table/tbody/tr[4]/td[2]"
  );

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
	let title = bookLinks.snapshotItem(i).textContent.trim() || `Book ${i + 1}`;
	items[fullLink] = title;
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
		"url": "https://persianpdf.com/book/%D8%AF%D8%A7%D9%86%D9%84%D9%88%D8%AF-%DA%A9%D8%AA%D8%A7%D8%A8-%D8%A7%D8%B1%D9%85%D8%BA%D8%A7%D9%86-%D9%85%D9%88%D8%B1-%D8%A7%D8%AB%D8%B1-%D8%B4%D8%A7%D9%87%D8%B1%D8%AE-%D9%85%D8%B3%DA%A9%D9%88%D8%A8/",
		"items": [
			{
				"itemType": "book",
				"title": "ارمغان مور",
				"creators": [
					{
						"lastName": "شاهرخ مسکوب",
						"creatorType": "author"
					}
				],
				"date": "1384",
				"libraryCatalog": "PersianPdf",
				"publisher": "نشر نی",
				"url": "https://persianpdf.com/book/%D8%AF%D8%A7%D9%86%D9%84%D9%88%D8%AF-%DA%A9%D8%AA%D8%A7%D8%A8-%D8%A7%D8%B1%D9%85%D8%BA%D8%A7%D9%86-%D9%85%D9%88%D8%B1-%D8%A7%D8%AB%D8%B1-%D8%B4%D8%A7%D9%87%D8%B1%D8%AE-%D9%85%D8%B3%DA%A9%D9%88%D8%A8/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://persianpdf.com/book/%D8%AF%D8%A7%D9%86%D9%84%D9%88%D8%AF-%DA%A9%D8%AA%D8%A7%D8%A8-%D8%AF%D8%B1%D8%B3%D9%86%D8%A7%D9%85%D9%87-%DA%A9%D9%84%DB%8C%D9%87-%D9%88-%D9%85%D8%AC%D8%A7%D8%B1%DB%8C-%D8%A7%D8%AF%D8%B1%D8%A7%D8%B1/",
		"items": [
			{
				"itemType": "book",
				"title": "کلیه و مجاری ادراری",
				"creators": [
					{
						"lastName": "برونر سوداث",
						"creatorType": "author"
					}
				],
				"date": "1397",
				"libraryCatalog": "PersianPdf",
				"publisher": "بشری",
				"url": "https://persianpdf.com/book/%D8%AF%D8%A7%D9%86%D9%84%D9%88%D8%AF-%DA%A9%D8%AA%D8%A7%D8%A8-%D8%AF%D8%B1%D8%B3%D9%86%D8%A7%D9%85%D9%87-%DA%A9%D9%84%DB%8C%D9%87-%D9%88-%D9%85%D8%AC%D8%A7%D8%B1%DB%8C-%D8%A7%D8%AF%D8%B1%D8%A7%D8%B1/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
