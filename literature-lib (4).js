{
	"translatorID": "c62f32e4-bea3-46c9-b7ed-996f9c920d69",
	"label": " literature-lib",
	"creator": "amirhosein",
	"target": "https://literaturelib.com",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-03-11 13:51:02"
}

function detectWeb(doc, url) {
    Zotero.debug("Checking item type...");
    if (url.match(/\\/books\\/\\d+$/)) {
        return "book";
    } else if (url.endsWith("/books")) {
        return "multiple";
    }
    return false;
}

function doWeb(doc, url) {
    if (detectWeb(doc, url) === "multiple") {
        scrapeMultiple(doc, url);
    } else {
        scrapeBookPage(doc, url);
    }
}

function scrapeMultiple(doc, url) {
    Zotero.debug("🔎 Scraping archive page...");

    let items = {};
    let bookLinks = doc.querySelectorAll(".book-list a"); // انتخاب لینک‌های کتاب

    for (let link of bookLinks) {
        let title = link.textContent.trim();
        let href = link.href;
        if (title && href) {
            items[href] = title;
        }
    }

    Zotero.selectItems(items, function (selectedItems) {
        if (!selectedItems) return;

        let urls = Object.keys(selectedItems);
        Zotero.debug(`📥 Processing books: ${urls.length} items`);
        Zotero.Utilities.processDocuments(urls, scrapeBookPage);
    });
}

function scrapeBookPage(doc, url) {
    Zotero.debug("✅ Scraping book page: " + url);

    let item = new Zotero.Item("book");

    // استخراج عنوان کتاب
    item.title = ZU.xpathText(doc, "//h1") || "Untitled";
    Zotero.debug(`📌 Title: ${item.title}`);

    // استخراج نام نویسنده
    let author = ZU.xpathText(doc, "//td[contains(@class, 'author')]");
    if (author) {
        item.creators.push({ lastName: author, creatorType: "author" });
        Zotero.debug(`🖊️ Author: ${author}`);
    }

    // استخراج ناشر
    let publisher = ZU.xpathText(doc, "//td[contains(@class, 'publisher')]");
    if (publisher) {
        item.publisher = publisher;
        Zotero.debug(`🏢 Publisher: ${publisher}`);
    }

    // استخراج لینک دانلود PDF
    let pdfLink = ZU.xpathText(doc, "//a[@download]/@href");
    if (pdfLink && !pdfLink.startsWith("http")) {
        pdfLink = "https://literaturelib.com" + pdfLink;
    }
    if (pdfLink) {
        item.attachments.push({ title: "Full Text PDF", mimeType: "application/pdf", url: pdfLink });
        Zotero.debug(`📄 PDF URL: ${pdfLink}`);
    }

    item.url = url;
    item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
