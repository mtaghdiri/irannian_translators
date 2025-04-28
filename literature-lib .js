{
	"translatorID": "c62f32e4-bea3-46c9-b7ed-996f9c920d69",
	"label": "literature-lib",
	"creator": "amirhosein",
	"target": "https://literaturelib.com",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-04-27 07:30:16"
}

function detectWeb(doc, url) {
  Zotero.debug("🔍 Checking item type...");

  // اگر URL الگوی صفحه کتاب داشت
  if (doc.includes("/books/") && !url.includes("?")) {
	Zotero.debug("📚 Single book page detected.");
	return "book";
  }

  // اگر URL صفحه جستجو یا آرشیو بود
  if (doc.includes("/books") && (url.includes("?") || url.endsWith("/books"))) {
	Zotero.debug("🗂️ Multiple items page detected.");
	return "multiple";
  }
Zotero.debug("not ditect");
  return false;
}

function doWeb(doc, url) {
  Zotero.debug("🌐 doWeb function called.");

  let type = detectWeb(doc, url);

  if (type === "book") {
	scrapeBookPage(doc, url);
  } else if (type === "multiple") {
	processMultiple(doc);
  }
}

function scrapeBookPage(doc, url) {
	Zotero.debug("✅ Scraping book page: " + url);

	let item = new Zotero.Item("book");

	// استخراج عنوان کتاب
	item.title = ZU.xpathText(doc, "//h1") || "Untitled";
	Zotero.debug(`📌 Title: ${item.title}`);

	// استخراج نام نویسنده
	let author = ZU.xpathText(doc, "//td[contains(@class, 'value')]"); 
	if (author) {
		item.creators.push({ lastName: author, creatorType: "author" });
		Zotero.debug(`🖊️ Author: ${author}`);
	}

	// استخراج ناشر
	item.publisher = ZU.xpathText(doc, "//td[contains(@class, 'value')][2]");
	Zotero.debug(`🏢 Publisher: ${item.publisher}`);

	// استخراج لینک دانلود PDF
	let pdfUrl = ZU.xpathText(doc, "//a[@download]/@href");
	if (pdfUrl && !pdfUrl.startsWith("http")) {
		pdfUrl = "https://literaturelib.com" + pdfUrl;  // اضافه کردن آدرس اصلی به لینک PDF
	}
	if (pdfUrl) {
		item.attachments.push({ title: "Full Text PDF", mimeType: "application/pdf", url: pdfUrl });
		Zotero.debug(`📄 PDF URL: ${pdfUrl}`);
	}

	item.url = url;
	item.complete();
}

function processMultiple(doc) {
	Zotero.debug("🔎 Scraping archive page...");

	let items = {};
	let imageContainers = doc.querySelectorAll("div.book-image-container");

	for (let container of imageContainers) {
		let link = container.querySelector("a[href*='/books/']");
		if (!link) continue;

		let href = link.getAttribute("href");
		let fullLink = href.startsWith("http") ? href : "https://literaturelib.com" + href;

		let title = link.getAttribute("title") || link.textContent.trim();

		if (title && fullLink && !(fullLink in items)) {
			items[fullLink] = title;
		}
	}

	Zotero.selectItems(items, function(selectedItems) {
		if (!selectedItems) return;
		
		let urls = Object.keys(selectedItems);
		ZU.processDocuments(urls, scrapeBookPage);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
