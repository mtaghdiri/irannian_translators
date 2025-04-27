{
	"translatorID": "ac27bfc1-c31a-4329-a3c4-7de01b99f5dc",
	"label": "molapub.ir",
	"creator": "amirhosein",
	"target": "https://www.molapub.ir",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-04-27 10:57:47"
}

async function detectWeb(doc, url) {
    Zotero.debug("MolaPub: Running detectWeb for URL: " + url);
    
    if (/\/products\/category\//.test(url)) {
        Zotero.debug("MolaPub: Detected archive page (multiple)");
        return "multiple";  // صفحه آرشیو
    }
    
    if (/\/products\/\d+\//.test(url)) {
        Zotero.debug("MolaPub: Detected book page (single)");
        return "book";  // صفحه تکی کتاب
    }
    
    Zotero.debug("MolaPub: No relevant page detected");
    return false;
}

async function doWeb(doc, url) {
    Zotero.debug("MolaPub: Starting doWeb");

    if (await detectWeb(doc, url) === "multiple") {
        Zotero.debug("MolaPub: Handling multiple items");

        let items = {};

        let links = doc.evaluate('//*[@id="app"]/app-pages/mat-sidenav-container/mat-sidenav-content/div/app-products/mat-sidenav-container/mat-sidenav-content/div[2]/div/mat-card/a[2]', doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        
        for (let i = 0; i < links.snapshotLength; i++) {
            let link = links.snapshotItem(i);
            let href = link.getAttribute('href');
            let title = link.textContent.trim();
            
            if (href && title) {
                let fullUrl = new URL(href, url).href; // تبدیل لینک نسبی به کامل
                items[fullUrl] = title;
                Zotero.debug(`MolaPub: Found item - Title: ${title} | URL: ${fullUrl}`);
            }
        }

        let selected = await Zotero.selectItems(items);
        if (!selected) {
            Zotero.debug("MolaPub: No items selected");
            return;
        }

        let urls = Object.keys(selected);
        for (let selectedUrl of urls) {
            await Zotero.HTTP.processDocuments(selectedUrl, scrapeSingleBookPage);
        }
    } else {
        await scrapeSingleBookPage(doc, url);
    }
}

async function scrapeSingleBookPage(doc, url) {
    Zotero.debug("MolaPub: Scraping book page: " + url);

    let newItem = new Zotero.Item("book");

    // عنوان کتاب
    let titleElement = doc.querySelector('h2');
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
