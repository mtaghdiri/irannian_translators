{
	"translatorID": "353bc937-ba9f-47b2-a42c-0124db30ae03",
	"label": "asmaneketab",
	"creator": "Mahdi",
	"target": "https://asmaneketab.ir/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-04-27 05:56:15"
}

function detectWeb(doc, url) {
	Zotero.debug("Checking item type...");

	// اگر URL شامل /product/ باشد، یعنی صفحه کتاب تکی است
	if (url.includes("/product/")) {
		Zotero.debug("تشخیص داده شد: کتاب تکی");
		return "book";
	}

	// اگر URL شامل product-category یا جستجو باشد، یعنی لیست چند کتاب است
	if (
		url === "https://asmaneketab.ir/" ||
		url.includes("/product-category/") ||
		url.includes("/?s=") ||
		url.includes("post_type=product")
	) {
		Zotero.debug("تشخیص داده شد: لیست کتاب‌ها");
		return "multiple";
	}

	// fallback در صورت نیاز
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

	let item = new Zotero.Item("book"); // نوع آیتم کتاب

	let rows = doc.querySelectorAll("#tab-additional_information table.shop_attributes tbody tr");
	let fieldMap = {};

	rows.forEach(row => {
		let keyEl = row.querySelector("th");
		let valueEl = row.querySelector("td p");

		if (keyEl && valueEl) {
			let key = keyEl.textContent.trim();
			let value = valueEl.textContent.trim();
			fieldMap[key] = value;
		}
	});

	item.title = fieldMap["نام کامل کتاب"];
	if (!item.title) throw new Error("عنوان کتاب پیدا نشد.");
	item.url = url;

	if (fieldMap["نویسنده"]) {
		item.creators.push({
			firstName: "",
			lastName: fieldMap["نویسنده"],
			creatorType: "author",
			fieldMode: 1
		});
	}

	if (fieldMap["مترجم"]) {
		item.creators.push({
			firstName: "",
			lastName: fieldMap["مترجم"],
			creatorType: "translator",
			fieldMode: 1
		});
	}

	if (fieldMap["مصحح"]) {
		item.creators.push({
			firstName: "",
			lastName: fieldMap["مصحح"],
			creatorType: "editor",
			fieldMode: 1
		});
	}

	item.publisher = fieldMap["ناشر"];
	item.edition = fieldMap["نوبت چاپ"];
	item.numPages = fieldMap["تعداد صفحات"];

	// تصویر جلد کتاب
	let coverImg;
	try {
		coverImg = ZU.xpath(doc, "//img[contains(@class, 'wp-post-image') and @title]")[0];

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

			Zotero.debug(`🖼️ Cover image attached: ${imageUrl}`);
		} else {
			Zotero.debug("❗ Cover image not found.");
		}
	} catch (e) {
		Zotero.debug(`❗ Error processing cover image: ${e}`);
	}

	// انتخاب همه لینک‌ها در هر محصول که حاوی لینک دانلود باشند
	let downloadLinks = doc.querySelectorAll(".woocommerce-product-details__short-description a");
	let downloadForm = doc.querySelector(".somdn-download-form");
	if(downloadLinks){
		downloadLinks.forEach((downloadLink) => {
		if (downloadLink && downloadLink.href) {
			let pdfUrl = downloadLink.href;
			// اگر لینک دانلود PDF موجود باشد، آن را به عنوان پیوست اضافه می‌کنیم
			item.attachments.push({
				title: "Full Text PDF",
				mimeType: "application/pdf",
				url: pdfUrl,
				download: true
			});

			Zotero.debug("📄 PDF download link found and attached.");
		} else {
			Zotero.debug("❗ PDF download link not found.");
		}
		});
	}
	else if (downloadForm) {
		let action = downloadForm.action;
		let formData = {};

		// پیدا کردن همه ورودی‌های مخفی فرم و استخراج داده‌ها
		downloadForm.querySelectorAll("input[type='hidden']").forEach(input => {
			formData[input.name] = input.value;
		});

		// ارسال درخواست POST برای دانلود
		ZU.doPost(action, formData, function(responseText, responseObj) {
			let filename = "book.pdf";
			let disposition = responseObj.getResponseHeader("Content-Disposition");

			// بررسی نام فایل از header
			if (disposition) {
				let match = disposition.match(/filename="?([^"]+)"?/);
				if (match) {
					filename = decodeURIComponent(match[1]);
				}
			}

			// بررسی موفقیت پاسخ و اضافه کردن فایل PDF
			if (responseObj.response) {
				item.attachments.push({
					title: "Full Text PDF",
					mimeType: "application/pdf",
					filename: filename,
					download: true,
					content: responseObj.response,  // محتوای فایل PDF به صورت باینری
					encoding: "base64"  // در صورتی که نیاز به base64 باشد
				});

				Zotero.debug("📄 PDF downloaded and attached.");
			} else {
				Zotero.debug("❗ PDF download failed.");
			}
		});
	}

	// پایان ذخیره‌سازی آیتم
	item.complete();
}


function processMultiple(doc, url) {
	Zotero.debug("Processing multiple items...");

	let items = {};

	// حالت 1: صفحات دسته‌بندی
	let loopLinks = doc.querySelectorAll("a.woocommerce-LoopProduct-link");
	for (let link of loopLinks) {
		let href = link.getAttribute("href");
		if (!href || !href.includes("/product/")) continue;

		let fullHref = new URL(href, url).href;
		let title = link.querySelector(".woocommerce-loop-product__title")?.textContent.trim();
		if (!title) title = link.textContent.trim() || fullHref;
		items[fullHref] = title;
	}

	// حالت 2: صفحه اصلی با ساختار متفاوت
	let mainPageItems = doc.querySelectorAll("div.item.product-item");
	for (let itemDiv of mainPageItems) {
		let title = itemDiv.querySelector(".item-title h2")?.textContent.trim();
		let link = itemDiv.querySelector("a[href*='/product/']");
		if (!title || !link) continue;

		let href = link.getAttribute("href");
		let fullHref = new URL(href, url).href;
		items[fullHref] = title;
	}

	if (Object.keys(items).length === 0) {
		Zotero.debug("هیچ کتابی پیدا نشد.");
		return;
	}

	Zotero.selectItems(items, function (selectedItems) {
		if (!selectedItems) return;
		let urls = Object.keys(selectedItems);
		ZU.processDocuments(urls, scrapeBookPage);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
