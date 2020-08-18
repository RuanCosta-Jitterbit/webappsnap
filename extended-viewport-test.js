const puppeteer = require('puppeteer');
var url = "http://thehenhouse.com.au/"; // page url
var name = "the";
var resWidth = 1366; // width of screenshot
var resHeight = 1000;

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, {waitUntil: 'load'});
//    await page.waitForNavigation({waitUntil: 'networkidle'});
    await page.setViewport({width: resWidth, height: resHeight});
    await page.emulateMediaType('screen');
    await page.screenshot({path: name + '-' + resWidth + '.jpeg', type: 'jpeg', fullPage: true});
    console.log("screenshot done");

    await browser.close();
})();