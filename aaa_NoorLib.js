{
	"translatorID": "e3ceb056-dc52-4a5c-b1b9-7dd3eefb4bc5",
	"label": "aaa_NoorLib",
	"creator": "Ali Tafakori",
	"target": "https://noorlib.ir/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-04-28 13:21:38"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

let idRe = /(?:\/([a-z]{2}))?\/book\/(?:info|view)\/([^#?/]+)/;

function detectWeb(doc, url) {
	if (idRe.test(url)) {
		return "book";
	}
	else if (/\/Specials\/(\d+)(\/[^\/]*)?$/.test(url)
		|| /\/user\/library\//.test(url)
		|| /\/book\/list/.test(url)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('#preview div.book-info div.book-title.has-tooltip a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	let [, lang, id] = url.match(idRe);
	let risURL = attr(doc, '#refDownload > a[href*="RIS" i]', 'href');
	if (!risURL) {
		risURL = `/api/citation/getCitationFile?format=RIS&bookId=${id}&language=${lang}`;
	}

	ZU.doGet(risURL, function (risText) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(risText);
		translator.setHandler("itemDone", function (obj, item) {
			// let hijri = false;
			for (let dateElem of doc.querySelectorAll('#publishYears')) {
				let date = dateElem.textContent;
				if (!hijri && date.includes('شمسی')) {
					item.date += lang == 'en' ? ' SH' : 'شمسی ';
					// hijri = true;
				}
				else if (!hijri && date.includes('قمری')) {
					item.date += lang == 'en' ? ' AH' : 'قمری ';
					// hijri = true;
				}
				if (date.includes('میلادی')) {
					item.date = ZU.strToISO(date);
					break;
				}
			}

			for (let creator of item.creators) {
				if (creator.fieldMode && creator.lastName.includes('،')) {
					let newCreator = ZU.cleanAuthor(
						creator.lastName.replace(/،/g, ','),
						creator.creatorType,
						true
					);
					delete creator.fieldMode;
					Object.assign(creator, newCreator);
				}
			}

			let volumeText = doc.querySelector('#totalVolumes')?.textContent?.trim();
			if (volumeText) {
				item.numberOfVolumes = volumeText;
			}

			let publisher = doc.querySelector('tr:nth-of-type(4) td span')?.textContent?.trim();
			if (publisher) item.publisher = publisher;

			let pubDate = doc.querySelector('#publishYears')?.textContent?.trim();
			if (pubDate && !item.date) item.date = ZU.strToISO(pubDate);

			let coverImg = doc.querySelector('div > div > div > div > section > div:nth-of-type(2) > section:nth-of-type(1) > section > div > div:nth-of-type(1) > div > div:nth-of-type(2) > div > img');
			if (coverImg && coverImg.src) item.attachments.push({ title: "Cover Image", mimeType: "image/jpeg", url: coverImg.src });

			item.complete();
		});
		translator.translate();
	});
}














// /*
// 	***** BEGIN LICENSE BLOCK *****

// 	Copyright © 2021 Abe Jellinek
	
// 	This file is part of Zotero.

// 	Zotero is free software: you can redistribute it and/or modify
// 	it under the terms of the GNU Affero General Public License as published by
// 	the Free Software Foundation, either version 3 of the License, or
// 	(at your option) any later version.

// 	Zotero is distributed in the hope that it will be useful,
// 	but WITHOUT ANY WARRANTY; without even the implied warranty of
// 	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// 	GNU Affero General Public License for more details.

// 	You should have received a copy of the GNU Affero General Public License
// 	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

// 	***** END LICENSE BLOCK *****
// */

// let idRe = /(?:\/([a-z]{2}))?\/book\/(?:info|view)\/([^#?/]+)/;

// function detectWeb(doc, url) {
// 	if (idRe.test(url)) {
// 		return "book";
// 	}
// 	else if (/\/Specials\/(\d+)(\/[^\/]*)?$/.test(url)
// 		|| /\/user\/library\//.test(url)
// 		|| /\/book\/list/.test(url)) {
// 		return "multiple";
// 	}
// 	return false;
// }




// function getSearchResults(doc, checkOnly) {
// 	var items = {};
// 	var found = false;
// 	var rows = doc.querySelectorAll('#preview div.book-info div.book-title.has-tooltip a');
// 	for (let row of rows) {
// 		let href = row.href;
// 		let title = ZU.trimInternal(row.textContent);
// 		if (!href || !title) continue;
// 		if (checkOnly) return true;
// 		found = true;
// 		let img = row.querySelector('#preview div.book-image-wrapper a div.book-image img');
// 		let coverURL = img ? img.src : null;

// 		// // Try to find the image URL from different known cases
// 		// let coverImg = row.querySelector('div.book-image.hover-shadow.has-tooltip > img')
// 		// 	|| row.querySelector('div.book-image.hover-shadow.multi-volume.has-tooltip > img:nth-child(3)')
// 		// 	|| row.querySelector('div.book-image.hover-shadow.multi-volume.has-tooltip > img.multi-volume__image');

// 		// let cover = coverImg?.getAttribute('src') || coverImg?.getAttribute('data-src') || null;
// 		items[href] = { title, coverURL };
// 	}

// 	return found ? items : false;
// }


// function doWeb(doc, url) {
// 	if (detectWeb(doc, url) == "multiple") {
// 		let items = getSearchResults(doc, false);
// 		let selectItems = {};
// 		for (let href in items) {
// 			selectItems[href] = items[href].title;
// 		}
// 		Zotero.selectItems(selectItems, function (selectedItems) {
// 			if (!selectedItems) return;
// 			let urls = Object.keys(selectedItems);
// 			for (let selectedUrl of urls) {
// 				let coverURL = items[selectedUrl]?.coverURL;
// 				ZU.processDocuments([selectedUrl], function (doc) {
// 					scrape(doc, selectedUrl, coverURL);
// 				});
// 			}
// 		});
// 	}
// 	else {
// 		scrape(doc, url);
// 	}
// }



// // function doWeb(doc, url) {
// // 	if (detectWeb(doc, url) == "multiple") {
// // 		let results = getSearchResults(doc, false);
// // 		let titles = {};
// // 		for (let [href, data] of Object.entries(results)) {
// // 			titles[href] = data.title;
// // 		}
// // 		Zotero.selectItems(titles, function (selectedItems) {
// // 			if (selectedItems) {
// // 				let urls = Object.keys(selectedItems);
// // 				ZU.processDocuments(urls, function (doc, url) {
// // 					let cover = results[url]?.cover;
// // 					scrape(doc, url, cover);
// // 				});
// // 			}
// // 		});
// // 	}
// // 	else {
// // 		scrape(doc, url);
// // 	}
// // }

// function scrape(doc, url, coverURL) {
// 	let [, lang, id] = url.match(idRe);
// 	let risURL = attr(doc, '#refDownload > a[href*="RIS" i]', 'href');
// 	if (!risURL) {
// 		risURL = `/api/citation/getCitationFile?format=RIS&bookId=${id}&language=${lang}`;
// 	}

// 	ZU.doGet(risURL, function (risText) {
// 		var translator = Zotero.loadTranslator("import");
// 		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
// 		translator.setString(risText);
// 		translator.setHandler("itemDone", function (obj, item) {
// 			let hijri = false;
// 			for (let dateElem of doc.querySelectorAll('[id^="publishYear"]')) {
// 				let date = dateElem.textContent;
// 				if (!hijri && date.includes('هجری')) {
// 					item.date += lang == 'en' ? ' AH' : 'هـ ';
// 					hijri = true;
// 				}
// 				else if (date.includes('میلادی')) {
// 					item.date = ZU.strToISO(date);
// 					break;
// 				}
// 			}

// 			for (let creator of item.creators) {
// 				if (creator.fieldMode && creator.lastName.includes('،')) {
// 					let newCreator = ZU.cleanAuthor(
// 						creator.lastName.replace(/،/g, ','),
// 						creator.creatorType,
// 						true
// 					);
// 					delete creator.fieldMode;
// 					Object.assign(creator, newCreator);
// 				}
// 			}

// 			let volumeText = doc.querySelector('#totalVolumes')?.textContent?.trim();
// 			if (volumeText) {
// 				item.numVolumes = volumeText;
// 			}

// 			let publisher = doc.querySelector('tr:nth-of-type(4) td span')?.textContent?.trim();
// 			if (publisher) item.publisher = publisher;

// 			let pubDate = doc.querySelector('tr:nth-of-type(5) td')?.textContent?.trim();
// 			if (pubDate && !item.date) item.date = ZU.strToISO(pubDate);

// 			if (coverURL) {
// 				item.attachments.push({
// 					title: "Cover Image",
// 					mimeType: "image/jpeg",
// 					url: coverURL
// 				});
// 			}
// 			else {
// 				let coverImg = doc.querySelector('div > div > div > div > section > div:nth-of-type(2) > section:nth-of-type(1) > section > div > div:nth-of-type(1) > div > div:nth-of-type(2) > div > img');
// 				if (coverImg && coverImg.src) item.attachments.push({ title: "Cover Image", mimeType: "image/jpeg", url: coverImg.src });
// 			}

// 			item.complete();
// 		});
// 		translator.translate();
// 	});
// }

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
