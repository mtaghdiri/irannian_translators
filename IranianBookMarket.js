{
	"translatorID": "12345678-abcd-efgh-ijkl-9876543210mn",
	"label": "Iranian Book Market",
	"creator": "نام شما",
	"target": "^https?://bazarketab\\.ir/",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-03-18 12:00:00"
}

function detectWeb(doc, url) {
	if (url.includes("/product/")) {
		return "book";
	}
	else if (url.includes("/products") || url.includes("/category/") || url.includes("/subject/")) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll("a[href^='/product/']");
	
	for (let row of rows) {
		let href = row.href;
		let title = row.textContent.trim();
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function(items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var item = new Zotero.Item("book");
	
	// پیاده‌سازی بسیار ساده برای آزمایش
	item.title = "تست کتاب"; // عنوان آزمایشی
	item.url = url;
	
	// افزودن یک نویسنده ساده
	item.creators.push({
		name: "نویسنده تست",
		creatorType: "author"
	});
	
	item.complete();
}