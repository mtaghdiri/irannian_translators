{
	"translatorID": "58cc53cd-c754-4639-ae6e-d5ef284fee6d",
	"label": "1111 ketab.cafe",
	"creator": "nahad mt",
	"target": "https://ketab.cafe/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-04-28 10:50:58"
}

// تشخیص اینکه صفحه، صفحه کتاب است یا لیست کتاب ها
function detectWeb(doc, url) {
	if (/^https?:\/\/ketab\.cafe\/[^\/]+\/$/.test(url)) {
		return "book";
	} else if (/^https?:\/\/ketab\.cafe\/library\/[^\/]+\/$/.test(url)) {
		return "multiple";
	}
	return false;
}

// انجام دانلود کتاب های تک صفحه ای یا صفحه لیست کتاب ها
function doWeb(doc, url) {
	if (detectWeb(doc, url) === "book") {
		scrapeBook(doc, url);
	} else {
		scrapeMultiple(doc, url);
	}
}

// برداشتن اطلاعات یک کتاب
function scrapeBook(doc, url) {
	let item = new Zotero.Item("book");

	// گرفتن متن خام عنوان
let rawTitle = ZU.xpathText(doc, "/html/body/div[2]/div[3]/div[2]/div/article/header/h1/a/@title");

// تعریف ریجکس برای پیدا کردن عنوان
let match = null;

// اول سعی کن با گیومه فارسی
if (rawTitle) {
	match = rawTitle.match(/“([^”]+)”/);
}

// اگر با گیومه فارسی پیدا نشد، امتحان کن با گیومه انگلیسی
if (!match && rawTitle) {
	match = rawTitle.match(/"([^"]+)"/);
}

// اگر هیچ گیومه‌ای نبود، دنبال "دانلود کتاب" بگرد و بعدش عنوان رو بگیر
if (!match && rawTitle) {
	let downloadMatch = rawTitle.match(/دانلود کتاب\s+(.+)/);
	if (downloadMatch) {
		match = [null, downloadMatch[1].trim()];
	}
}

// تنظیم عنوان نهایی
item.title = match?.[1]?.trim() || rawTitle?.trim() || "عنوان نامشخص";


//	گرفتن نام نویسنده
	let authorNode = doc.querySelector('blockquote p span em:nth-of-type(3) span');
	let authorName = authorNode ? authorNode.textContent.trim() : null;
	if (authorName) {
		item.creators.push({
			lastName: authorName,
			firstName: "",
			creatorType: "author"
		});
	} else {
		item.creators.push({
			lastName: "ناشناس",
			firstName: "",
			creatorType: "author"
		});
	}
	// گرفتن نام نویسنده با چند روش مختلف
// let authorName = null;

// // روش اول: سلکتور اصلی
// let authorNode1 = doc.querySelector('blockquote p span em:nth-of-type(3) span');
// if (authorNode1) {
// 	authorName = authorNode1.textContent.trim();
// }

// // اگر روش اول جواب نداد، روش دوم: XPath دوم
// if (!authorName) {
// 	let authorNode2 = ZU.xpathText(doc, '/html/body/div[2]/div[3]/div[2]/div/article/div[2]/div/blockquote[2]/p[1]/span/em[3]/span');
// 	if (authorNode2) {
// 		authorName = authorNode2.trim();
// 	}
// }

// // اگر باز هم پیدا نشد، روش سوم: از <span> با متن حاوی "مولف:"
// // (جستجوی دستی بین spanها)
// if (!authorName) {
// 	let spanNodes = doc.querySelectorAll('span[style]');ط
// 	for (let span of spanNodes) {
// 		let text = span.textContent.trim();
// 		if (text.startsWith('مولف:')) {
// 			// نویسنده بعد از مولف:
// 			authorName = text.replace('مولف:', '').replace('<br>', '').trim();
// 			break;
// 		}
// 	}
// }

// // گذاشتن نویسنده در آیتم
// if (authorName) {
// 	item.creators.push({
// 		lastName: authorName,
// 		firstName: "",
// 		creatorType: "author"
// 	});
// } else {
// 	item.creators.push({
// 		lastName: "ناشناس",
// 		firstName: "",
// 		creatorType: "author"
// 	});
// }



	// اضافه کردن عکس جلد کتاب
	let coverImg = doc.querySelector('article div p img');
	if (coverImg && coverImg.src) {
		let imgURL = new URL(coverImg.src, url).href;
		item.attachments.push({
			title: "Book Cover",
			mimeType: "image/jpeg",
			url: imgURL,
			snapshot: true
		});
	}

	// اضافه کردن فایل دانلودی کتاب
	let pdfLinks = doc.querySelectorAll('a[href$=".pdf"]');
	if (pdfLinks.length > 0) {
		let pdfURL = new URL(pdfLinks[0].href, url).href;
		item.attachments.push({
			title: "Full Text PDF",
			mimeType: "application/pdf",
			url: pdfURL
		});
	}

	// گرفتن تگ‌های کتاب
let tagContainer = doc.querySelector('div[class*="tags"]') || doc.querySelector('div[role="list"]');

if (!tagContainer) {
	// اگر تگ‌ها در مسیر قبلی نبودند، از مسیر "post-page-asli" استخراج کن
	tagContainer = doc.querySelector('div.post-page-asli > div > div');
}

if (tagContainer) {
	let tagLinks = tagContainer.querySelectorAll('a');
	tagLinks.forEach(link => {
		let tag = link.textContent.trim();
		if (tag) {
			item.tags.push(tag);
		}
	});
}


	// اطلاعات پایه
	item.language = "fa";
	item.url = url;
	item.libraryCatalog = "کافه کتاب";

	item.complete();
}

// برداشتن اطلاعات از صفحه لیست کتاب‌ها
function scrapeMultiple(doc, url) {
	let items = {};
	let links = doc.querySelectorAll('a[href^="https://ketab.cafe/"]:not([href*="/library/"])');
	links.forEach(link => {
		let href = link.href;
		if (/^https?:\/\/ketab\.cafe\/[^\/]+\/$/.test(href)) {
			items[href] = link.textContent.trim();
		}
	});

	Zotero.selectItems(items, function (selected) {
		if (!selected) return;
		let urls = Object.keys(selected);
		ZU.processDocuments(urls, scrapeBook);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
