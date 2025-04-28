/**
 * Fidibo.js
 * ترنزلیتور زوترو برای سایت فیدیبو
 * 
 * این ترنزلیتور اطلاعات کتاب‌ها و مجلات را از سایت فیدیبو استخراج می‌کند
 */

function detectWeb(doc, url) {
    Zotero.debug("بررسی نوع محتوای فیدیبو...");
    
    if (url.toLowerCase().includes("/book/")) {
        Zotero.debug("نوع محتوا: کتاب (تشخیص از URL)");
        return "book";
    }
    
    Zotero.debug("نوع محتوا شناسایی نشد");
    return false;
}

function doWeb(doc, url) {
    Zotero.debug("اجرای تابع doWeb برای فیدیبو...");
    let itemType = detectWeb(doc, url);
    Zotero.debug("نوع محتوای تشخیص داده شده: " + itemType);
    
    if (itemType === "book") {
        Zotero.debug("شروع استخراج اطلاعات کتاب...");
        scrapeBookPage(doc, url);
    } else {
        Zotero.debug("خطا: نوع محتوا 'کتاب' نیست! URL: " + url);
        throw new Error("نوع محتوا شناسایی نشد");
    }
}

function scrapeBookPage(doc, url) {
    Zotero.debug("استخراج اطلاعات صفحه کتاب فیدیبو...");
    
    let item = new Zotero.Item("book");
    
    try {
        // استخراج عنوان
        let titleSelectors = [
            'h1.book-title',
            '.product-info h1',
            '.book-details h1',
            '.product-title h1',
            'h1[itemprop="name"]',
            'h1'
        ];
        
        for (let selector of titleSelectors) {
            let titleElement = doc.querySelector(selector);
            if (titleElement && titleElement.textContent.trim()) {
                item.title = titleElement.textContent.trim();
                Zotero.debug("عنوان کتاب یافت شد: " + item.title);
                break;
            }
        }
        
        if (!item.title) {
            let titleXPaths = [
                "/html/body/div/div[1]/div/div/div/div/div/div/div[3]/div[1]/div/div[1]/div[1]/h1",
                "//h1[contains(@class, 'book-title')]",
                "//div[contains(@class, 'book-details')]//h1",
                "//div[contains(@class, 'product-info')]//h1",
                "//h1[contains(@itemprop, 'name')]"
            ];
            
            for (let xpath of titleXPaths) {
                let title = ZU.xpathText(doc, xpath);
                if (title) {
                    item.title = title.trim();
                    Zotero.debug("عنوان کتاب با XPath یافت شد: " + item.title);
                    break;
                }
            }
        }
        
        if (!item.title) {
            let metaTitle = doc.querySelector('meta[property="og:title"]')?.content || doc.querySelector('meta[name="title"]')?.content;
            if (metaTitle) {
                item.title = metaTitle.trim();
                Zotero.debug("عنوان از متادیتا: " + item.title);
            } else {
                throw new Error("عنوان کتاب در صفحه فیدیبو یافت نشد");
            }
        }
        
        // استخراج نویسنده
        try {
            let ogAuthor = doc.querySelector('meta[property="book:author"]') || doc.querySelector('meta[name="author"]');
            if (ogAuthor && ogAuthor.content) {
                item.creators.push({
                    firstName: "",
                    lastName: ogAuthor.content.trim(),
                    creatorType: "author",
                    fieldMode: 1
                });
                Zotero.debug("نویسنده از متا تگ: " + ogAuthor.content);
            } else {
                let authorSelectors = [
                    'a[itemprop="author"]',
                    '.book-author a',
                    '.product-author a',
                    '.creator a',
                    '.product-info a[href*="/author/"]',
                    '.book-author span',
                    '.author-name',
                    'a[href*="/author/"]',
                    '.product-details a[href*="/author/"]'
                ];
                
                let authorFound = false;
                for (let selector of authorSelectors) {
                    let authors = doc.querySelectorAll(selector);
                    if (authors.length > 0) {
                        for (let author of authors) {
                            if (author.textContent.trim()) {
                                item.creators.push({
                                    firstName: "",
                                    lastName: author.textContent.trim(),
                                    creatorType: "author",
                                    fieldMode: 1
                                });
                                authorFound = true;
                                Zotero.debug("نویسنده یافت شد: " + author.textContent.trim());
                            }
                        }
                        if (authorFound) break;
                    }
                }
                
                if (!authorFound) {
                    let authorXPaths = [
                        "//*[contains(text(), 'نویسنده')]/following-sibling::*//a",
                        "//*[contains(text(), 'نویسنده')]/following-sibling::*//span",
                        "//div[contains(@class, 'book-authors')]//a",
                        "//div[contains(@class, 'product-author')]//a",
                        "//span[contains(@class, 'author-name')]",
                        "//div[contains(@class, 'product-details')]//a[contains(@href, '/author/')]"
                    ];
                    
                    for (let xpath of authorXPaths) {
                        let authors = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                        for (let i = 0; i < authors.snapshotLength; i++) {
                            let author = authors.snapshotItem(i).textContent.trim();
                            if (author) {
                                item.creators.push({
                                    firstName: "",
                                    lastName: author,
                                    creatorType: "author",
                                    fieldMode: 1
                                });
                                authorFound = true;
                                Zotero.debug("نویسنده با XPath یافت شد: " + author);
                            }
                        }
                        if (authorFound) break;
                    }
                }

                if (!authorFound) {
                    Zotero.debug("نویسنده یافت نشد، مقدار پیش‌فرض تنظیم می‌شود");
                    item.creators.push({
                        firstName: "",
                        lastName: "ناشناس",
                        creatorType: "author",
                        fieldMode: 1
                    });
                }
            }
        } catch (e) {
            Zotero.debug("خطا در استخراج نویسنده: " + e.message);
            item.creators.push({
                firstName: "",
                lastName: "ناشناس",
                creatorType: "author",
                fieldMode: 1
            });
        }
        
        // استخراج ناشر
        try {
            let publisherSelectors = [
                'a[itemprop="publisher"]',
                '.book-publisher a',
                '.product-publisher a',
                '.product-info a[href*="publisher"]',
                '.publisher-name',
                '.book-publisher span'
            ];
            
            let publisherFound = false;
            for (let selector of publisherSelectors) {
                let publisher = doc.querySelector(selector);
                if (publisher && publisher.textContent.trim()) {
                    item.publisher = publisher.textContent.trim();
                    publisherFound = true;
                    Zotero.debug("ناشر یافت شد: " + item.publisher);
                    break;
                }
            }
            
            if (!publisherFound) {
                let publisherXPaths = [
                    "//*[contains(text(), 'ناشر')]/following-sibling::*//a",
                    "//*[contains(text(), 'ناشر')]/following-sibling::*//span",
                    "//div[contains(@class, 'book-publisher')]//a",
                    "//div[contains(@class, 'product-publisher')]//a",
                    "//span[contains(@class, 'publisher-name')]"
                ];
                
                for (let xpath of publisherXPaths) {
                    let publisher = ZU.xpathText(doc, xpath);
                    if (publisher) {
                        item.publisher = publisher.trim();
                        Zotero.debug("ناشر با XPath یافت شد: " + item.publisher);
                        break;
                    }
                }
            }
        } catch (e) {
            Zotero.debug("خطا در استخراج ناشر: " + e.message);
        }
        
        // استخراج سال انتشار
        try {
            let dateSelectors = [
                '.book-year',
                '.publish-year',
                '.product-year',
                '.publish-date'
            ];
            
            let dateFound = false;
            for (let selector of dateSelectors) {
                let date = doc.querySelector(selector);
                if (date && date.textContent.trim()) {
                    item.date = date.textContent.trim();
                    dateFound = true;
                    Zotero.debug("سال انتشار یافت شد: " + item.date);
                    break;
                }
            }
            
            if (!dateFound) {
                let dateXPaths = [
                    "//*[contains(text(), 'سال انتشار')]/following-sibling::*",
                    "//tr[contains(.,'سال انتشار')]//td[2]",
                    "//div[contains(@class, 'book-year')]",
                    "//div[contains(@class, 'publish-date')]"
                ];
                
                for (let xpath of dateXPaths) {
                    let date = ZU.xpathText(doc, xpath);
                    if (date) {
                        item.date = date.trim();
                        Zotero.debug("سال انتشار با XPath یافت شد: " + item.date);
                        break;
                    }
                }
            }
        } catch (e) {
            Zotero.debug("خطا در استخراج سال انتشار: " + e.message);
        }
        
        // استخراج شابک
        try {
            let isbnSelectors = [
                '.book-isbn',
                '.product-isbn',
                '[itemprop="isbn"]'
            ];
            
            let isbnFound = false;
            for (let selector of isbnSelectors) {
                let isbn = doc.querySelector(selector);
                if (isbn && isbn.textContent.trim()) {
                    item.ISBN = isbn.textContent.trim().replace(/-/g, "");
                    isbnFound = true;
                    Zotero.debug("شابک یافت شد: " + item.ISBN);
                    break;
                }
            }
            
            if (!isbnFound) {
                let isbnXPaths = [
                    "//*[contains(text(), 'شابک')]/following-sibling::*",
                    "//tr[contains(.,'شابک')]//td[2]",
                    "//*[contains(@itemprop, 'isbn')]"
                ];
                
                for (let xpath of isbnXPaths) {
                    let isbn = ZU.xpathText(doc, xpath);
                    if (isbn) {
                        item.ISBN = isbn.trim().replace(/-/g, "");
                        Zotero.debug("شابک با XPath یافت شد: " + item.ISBN);
                        break;
                    }
                }
            }
        } catch (e) {
            Zotero.debug("خطا در استخراج شابک: " + e.message);
        }
        
        // استخراج زبان
        try {
            let languageSelectors = [
                '.book-language',
                '.product-language'
            ];
            
            let languageFound = false;
            for (let selector of languageSelectors) {
                let language = doc.querySelector(selector);
                if (language && language.textContent.trim()) {
                    item.language = language.textContent.trim() === "فارسی" ? "fa" : language.textContent.trim();
                    languageFound = true;
                    Zotero.debug("زبان یافت شد: " + item.language);
                    break;
                }
            }
            
            if (!languageFound) {
                let languageXPaths = [
                    "//*[contains(text(), 'زبان')]/following-sibling::*",
                    "//tr[contains(.,'زبان')]//td[2]"
                ];
                
                for (let xpath of languageXPaths) {
                    let language = ZU.xpathText(doc, xpath);
                    if (language) {
                        item.language = language.trim() === "فارسی" ? "fa" : language.trim();
                        Zotero.debug("زبان با XPath یافت شد: " + item.language);
                        break;
                    }
                }
            }
            
            if (!languageFound) {
                let metaLang = doc.querySelector('meta[http-equiv="content-language"]')?.content || doc.querySelector('html')?.lang;
                if (metaLang && metaLang.includes('fa')) {
                    item.language = 'fa';
                    Zotero.debug("زبان از متادیتا: " + item.language);
                } else {
                    item.language = 'fa';
                    Zotero.debug("زبان پیش‌فرض: fa");
                }
            }
        } catch (e) {
            Zotero.debug("خطا در استخراج زبان: " + e.message);
            item.language = 'fa';
        }
        
        // استخراج خلاصه
        try {
            let abstractSelectors = [
                '.book-description',
                '.product-description',
                '.book-summary',
                '.product-summary',
                '[itemprop="description"]'
            ];
            
            let abstractFound = false;
            for (let selector of abstractSelectors) {
                let abstract = doc.querySelector(selector);
                if (abstract && abstract.textContent.trim()) {
                    item.abstractNote = abstract.textContent.trim();
                    abstractFound = true;
                    Zotero.debug("خلاصه کتاب یافت شد");
                    break;
                }
            }
            
            if (!abstractFound) {
                let abstractXPaths = [
                    "//div[contains(@class, 'book-description')]",
                    "//div[contains(@class, 'book-summary')]",
                    "//div[contains(@class, 'product-description')]",
                    "//*[contains(@itemprop, 'description')]"
                ];
                
                for (let xpath of abstractXPaths) {
                    let abstract = ZU.xpathText(doc, xpath);
                    if (abstract) {
                        item.abstractNote = abstract.trim();
                        Zotero.debug("خلاصه کتاب با XPath یافت شد");
                        break;
                    }
                }
            }
        } catch (e) {
            Zotero.debug("خطا در استخراج خلاصه: " + e.message);
        }
        
        // استخراج تصویر جلد
        try {
            extractCoverImage(doc, url, item);
        } catch (e) {
            Zotero.debug("خطا در استخراج تصویر جلد: " + e.message);
        }
    } catch (e) {
        Zotero.debug("خطا در استخراج اطلاعات: " + e.message);
    }
    
    // ذخیره URL و غیرفعال کردن snapshot
    item.attachments = [];
    item.url = url;
    
    Zotero.debug("آیتم آماده ذخیره‌سازی است");
    item.complete();
}

function extractCoverImage(doc, url, item) {
    Zotero.debug("شروع استخراج تصویر جلد کتاب...");
    
    let allImages = doc.querySelectorAll('img');
    Zotero.debug(`تعداد کل تصاویر در صفحه: ${allImages.length}`);
    for (let img of allImages) {
        Zotero.debug(`تصویر: src=${img.src || 'خالی'}, data-src=${img.getAttribute('data-src') || 'خالی'}, alt=${img.getAttribute('alt') || 'خالی'}`);
    }

    let ogImage = doc.querySelector('meta[property="og:image"]');
    if (ogImage && ogImage.content) {
        let coverImgUrl = ogImage.content;
        Zotero.debug("تصویر Open Graph یافت شد: " + coverImgUrl);
        addCoverAttachment(item, coverImgUrl);
        return true;
    }
    
    let productImage = doc.querySelector('.product-img img');
    if (productImage && productImage.src) {
        let coverImgUrl = productImage.src;
        Zotero.debug("تصویر محصول با کلاس product-img یافت شد: " + coverImgUrl);
        addCoverAttachment(item, coverImgUrl);
        return true;
    }
    
    let selectors = [
        '.book-img img', 
        '.product-img img', 
        '.book-cover img', 
        '.book-image img',
        'img.book-cover',
        '.book-details img',
        '.fidibo-book-cover img',
        '.book-main-image img',
        '.fidibo-product-image img',
        '.cover-image img',
        'img[itemprop="image"]'
    ];
    
    for (let selector of selectors) {
        let img = doc.querySelector(selector);
        if (img && img.src) {
            let coverImgUrl = img.src;
            Zotero.debug("تصویر با سلکتور '" + selector + "' یافت شد: " + coverImgUrl);
            addCoverAttachment(item, coverImgUrl);
            return true;
        }
    }
    
    let xpaths = [
        "//div[contains(@class, 'product-img')]//img/@src",
        "//div[contains(@class, 'book-img')]//img/@src",
        "//div[contains(@class, 'book-cover')]//img/@src",
        "//div[contains(@class, 'book-image')]//img/@src",
        "//img[contains(@class, 'book-cover')]/@src",
        "//img[contains(@alt, 'کتاب') or contains(@alt, 'جلد')]/@src",
        "//img[contains(@alt, 'مجله')]/@src",
        "//div[contains(@class, 'fidibo-book')]//img/@src",
        "//div[contains(@class, 'product-details')]//img/@src",
        "//div[contains(@class, 'book-main-image')]//img/@src",
        "//div[contains(@class, 'fidibo-product-image')]//img/@src",
        "//img[@itemprop='image']/@src"
    ];
    
    for (let xpath of xpaths) {
        let coverImgUrl = ZU.xpathText(doc, xpath);
        if (coverImgUrl) {
            Zotero.debug("تصویر با XPath '" + xpath + "' یافت شد: " + coverImgUrl);
            addCoverAttachment(item, coverImgUrl);
            return true;
        }
    }
    
    let lazyImages = doc.querySelectorAll('img[data-src], img[data-lazy-src]');
    for (let img of lazyImages) {
        let coverImgUrl = img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
        if (coverImgUrl && (coverImgUrl.includes('fidibo') || 
                            img.getAttribute('alt')?.match(/کتاب|جلد|کاور|cover/i))) {
            Zotero.debug("تصویر lazy-load یافت شد: " + coverImgUrl);
            addCoverAttachment(item, coverImgUrl);
            return true;
        }
    }
    
    let mainContentImages = doc.querySelectorAll('.product-details img, .book-details img');
    if (mainContentImages.length > 0) {
        let coverImgUrl = mainContentImages[0].src;
        Zotero.debug("اولین تصویر در منطقه جزئیات محصول یافت شد: " + coverImgUrl);
        addCoverAttachment(item, coverImgUrl);
        return true;
    }
    
    // Fallback: ساخت URL تصویر کاور بر اساس شناسه کتاب
    let bookIdMatch = url.match(/\/book\/(\d+)-/);
    if (bookIdMatch) {
        let bookId = bookIdMatch[1];
        let coverImgUrl = `https://cdn.fidibo.com/images/books/${bookId}_front_cover.jpg`;
        Zotero.debug("تلاش برای استفاده از URL ساخته‌شده تصویر کاور: " + coverImgUrl);
        addCoverAttachment(item, coverImgUrl);
        return true;
    }
    
    Zotero.debug("هیچ تصویر جلد کتابی یافت نشد!");
    return false;
}

function addCoverAttachment(item, coverImgUrl) {
    try {
        if (!coverImgUrl.startsWith('http')) {
            let baseURL = 'https://fidibo.com';
            coverImgUrl = new URL(coverImgUrl, baseURL).href;
        }

        if (!coverImgUrl.match(/\.(jpg|jpeg|png|gif)$/i)) {
            Zotero.debug("URL تصویر معتبر نیست: " + coverImgUrl);
            return;
        }

        item.attachments.push({
            title: "تصویر جلد کتاب",
            mimeType: "image/jpeg",
            url: coverImgUrl,
            snapshot: false
        });

        Zotero.debug("پیوست تصویر جلد اضافه شد.");
    } catch (e) {
        Zotero.debug("خطا در افزودن تصویر جلد: " + e.message);
    }
}