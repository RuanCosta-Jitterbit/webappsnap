// Connects to app to take screenshots of each page defined in config
'use strict';
const { chromium, firefox, webkit } = require('playwright');
const { argv } = require('yargs');
const uf = require('url');
const path = require('path');
const { randomBytes } = require('node:crypto');
const fs = require('fs');
const prompt = require('prompt-sync')(); // Get input
const dayjs = require('dayjs');
const sharp = require('sharp');

if (!argv.config) {
    console.log("Missing config file (--config <path/to/config.json>)");
    return;
}
if (!argv.instance) {
    console.log("Missing instance name (--instance <instance-name>)");
    return;
}
// TODO check instance exists in config

(async () => {
    const config = require(argv.config);
    const settings = config.settings; // General snap config
    const pages = config.pages; // Page definitions
    const instance = config.instance[argv.instance];
    if (argv.full && !instance.container) {
        console.error('--full option but instance.<instance-name>.container not set');
        return;
    }

    const hostname = uf.parse(instance.server).hostname; // The app URL/server/IP
    const timestamp = dayjs().format('YYYYMMDD_HHmmss');
    const dir = path.join(
        settings.dir,
        (settings.timestamp ? timestamp : ''),
        argv.instance); // Images save path
    const ext = settings.ext;   // Image file extension (png/jpg)
    const trace_file = path.join(dir, "trace.zip");
    mkdir(dir);    // Create image save directory TODO move to snap function

    if (settings.debug) {
        console.log(`Hostname: ${hostname}`);
        console.log(`Image directory: ${dir}`)
        console.log(`Default viewport: ${settings.width}x${settings.height}`);
        console.log(`Image directory timestamp: ${Boolean(settings.timestamp)}`);
        console.log(`Image filename sequence numbers: ${Boolean(settings.seq)}`);
        console.log(`Image filename prefix: ${settings.pfx}`);
        console.log(`Image filename suffix: ${settings.ext}`);
        if (ext.match(/\.jpg$/)) { console.log(`  JPG quality: ${settings.jpg_quality}`); }
        console.log(`Scale factor: ${settings.scale}`);
        console.log(`Default page load: ${instance.wait / 1000} seconds`);
        console.log(`Default step pause: ${instance.pause / 1000} ${Math.floor(instance.pause / 1000) == 1 ? "second" : "seconds"}`);
        console.log(`SlowMo value: ${settings.slowmo / 1000} seconds`);
        console.log(`Headless mode: ${Boolean(settings.headless)}`);
        console.log(`Record video: ${Boolean(settings.video)}`);
        console.log(`Trace: ${Boolean(settings.trace)}${settings.trace ? ' (' + trace_file + ')' : ''}`);
        console.log(`Snap container panels beyond viewport (--full): ${Boolean(argv.full)}`);
    }

    // TODO User select browser type: chromium, firefox, webkit
    //    const browser = await firefox.launch({
    const browser = await chromium.launch({
        headless: settings.headless,
        slowMo: settings.slowmo
    });

    let context_options = {
        deviceScaleFactor: settings.scale,
        viewport: {
            width: settings.width,
            height: settings.height
        },
    };
    if (settings.video) {
        context_options = {
            ...context_options,
            ...{
                recordVideo: {
                    dir: dir,
                    size: {
                        width: settings.width,
                        height: settings.height
                    }
                },
                screen: {
                    width: settings.width,
                    height: settings.height
                }
            }
        };
    }
    const context = await browser.newContext(context_options);
    if (settings.trace) {
        await context.tracing.start({ screenshots: true, snapshots: true });
    }
    var page = await context.newPage();

    // Can specify up to 6 custom page prefixes
    const server_url_prefixes = [
        instance.a ? instance.a : null,
        instance.b ? instance.b : null,
        instance.c ? instance.c : null,
        instance.d ? instance.d : null,
        instance.e ? instance.e : null,
        instance.f ? instance.f : null
    ];

    for (var d in pages) {
        var pg = pages[d]; // convenience handle

        // Pages (and operations, and steps) can use "skip": true
        if (pg.skip) {
            console.log(`Page ${d}: SKIP - ${pg.name} (${pg.comment})`);
            continue;
        }
        console.log(`Page ${d}: ${pg.name} (${pg.comment})`);

        page.setDefaultTimeout(instance.wait);
        const wait = Number((pg.wait ? pg.wait : instance.wait)); // Per-page waits override the default

        // Build URL and add option string if provided
        var server_url;
        var option_string = "";
        if (pg.options) { option_string = "?" + pg.options.join('&'); }

        // Construct the page's URL or use the override value
        if (pg.url) {
            server_url = new URL([instance.server, pg.url].join('/'));
        } else {
            server_url = new URL(
                [
                    instance.server,
                    // filter out unset prefixes
                    server_url_prefixes.filter(x => typeof x === 'string' && x.length > 0).join('/')
                ].join('/'));
            if (pg.uid) {
                server_url = new URL([server_url, pg.uid].join('/'));
            }
        }
        server_url = `${server_url}${option_string}`

        // Load URL
        try {
            console.log(`  Loading ${server_url} (timeout ${wait / 1000} ${Math.floor(wait / 1000) == 1 ? "second" : "seconds"})`);
            await page.goto(server_url, { timeout: wait });
            await page.waitForTimeout(wait); // Explicit additional wait for content to load
        } catch (e) {
            console.error(`Can't load ${server_url} - skipping (${e})`);
        }

        // Per-page viewport
        const current_page_vp = page.viewportSize();
        if (pg.viewport) {
            console.log(`  Viewport for page: ${pg.viewport.width}x${pg.viewport.height}`);
            await viewport(page, pg.viewport, instance.wait);
        }

        // Page-level snap (no operations)
        if (!pg.operations) {
            await snap(page, path.join(dir, pg.name), pg.options, settings);

            // Snap container without cropping at viewport
            // Skip any using 'url' element
            // Note: For many apps, simply using the 'fullPage' option isn't enough, as the app will contain
            // a static wrapper around scrollable content. This is why there is a 'container' option
            // for instances.
            // https://playwright.dev/docs/api/class-page#page-screenshot-option-full-page
            if (argv.full && !pg.url) {
                try {
                    // Get height of container
                    const elem = await page.waitForSelector(instance.container, { visible: true });
                    const bx = await elem.boundingBox();
                    const current_vp = page.viewportSize(); // save current viewport
                    // Resize viewport to container height plus padding. Keep width the same.
                    const vp = { width: current_vp.width, height: bx.height + 150 };
                    await viewport(page, vp, instance.wait);
                    await snap(page, path.join(dir, pg.name + "_full"), { ...pg.options, fullPage: true }, settings);
                    await viewport(page, current_vp, instance.wait); // reset viewport
                }
                catch (e) {
                    console.log(`  ERROR ${e}`);
                }
            }
        }

        // Operations - Any number of groups of steps
        // With no operations, a dashboard is automatically snapped.
        // If operations are used, dedicate at least one step to a full-window snap,
        // or add another dashboard entry with no operations.
        for (var o in pg.operations) {
            var op = pg.operations[o]; // Convenience handle
            if (op.skip) {
                console.log(`  Operation ${o}: SKIP - ${op.name} (${op.comment})`);
                continue;
            }
            console.log(`  Operation ${o}: ${op.name} (${op.comment})`);

            // Repeat operations if loop is set
            var loop = (op.loop > 1) ? op.loop : 1;
            if (loop > 1) { console.log(`    Operation loop count: ${loop}`); }

            for (let n = 0; n < loop; n++) {
                console.log(`    Operation loop: ${n + 1} of ${loop}`);

                // Per-operation viewport
                const current_operation_vp = page.viewportSize();
                if (op.viewport) {
                    console.log(`    Viewport for operation: ${op.viewport.width}x${op.viewport.height}`);
                    await viewport(page, op.viewport, instance.wait);
                }

                for (var s in op.steps) {
                    var step = op.steps[s]; // Convenience handle
                    if (step.skip) {
                        console.log(`      Step ${s}: SKIP - ${step.type} - ${step.name} (${step.comment})`);
                        continue;
                    }
                    console.log(`      Step ${s}: ${step.type} - ${step.name} - Selector (${step.locator}): ${step.selector} - Value: ${step.value} (${step.comment})`);

                    // Viewport per step
                    const current_step_vp = page.viewportSize();
                    if (step.viewport) {
                        console.log(`        Viewport for step: ${step.viewport.width}x${step.viewport.height}`);
                        await viewport(page, step.viewport, instance.wait);
                    }

                    var loc;
                    switch (step.locator) {
                        case "css":
                            loc = page.locator(step.selector, step.options);
                            break;

                        case "label":
                            loc = page.getByLabel(step.selector, step.options);
                            break;

                        case "placeholder":
                            loc = page.getByPlaceholder(step.selector, step.options);
                            break;

                        case "getbytext":
                            loc = page.getByText(step.selector,
                                {
                                    "exact": true, // Default option
                                ...step.options
                                });
                            break;

                        case "getbyrole":
                            loc = page.getByRole(step.selector, step.options);
                            break;

                        default:
                            loc = page;
                            break;
                    }

                    try {
                        await page.waitForTimeout(instance.pause);

                        switch (step.type) {
                            // Flow control
                            case "quit":
                                if (settings.trace) {
                                    await context.tracing.stop({ path: trace_file });
                                }
                                browser.close();
                                process.exit(0);
                                break; // fwiw

                            // User Input
                            case "click":
                                await loc.click();
                                break;

                            case "dblclick":
                                await loc.dblclick();
                                break;

                            case "text":
                                var value = step.value;
                                // Process special tokens
                                value = value.replace("RANDOM", randomBytes(settings.randlen).toString('hex'));

                                if (fs.existsSync(instance.secret)) {
                                    const secret = require(instance.secret);
                                    value = value.replace("USER", secret.user);
                                    value = value.replace("LOGIN", secret.login);
                                    value = value.replace("PASSWORD", secret.password);
                                }
                                console.log(`        Actual value: ${value}`);
                                await loc.fill(value);
                                break;

                            case "press":
                                for (var k in step.value) {
                                    var key = String(step.value[k]);
                                    await page.press('body', key);
                                    await page.waitForTimeout(500);
                                }
                                break;

                            //  Movement
                            case "move":
                                await loc.hover(step.options);
                                break;

                            case "focus":
                                await loc.focus();
                                break;

                            case "back":
                                await page.goBack();
                                break;

                            case "ask":
                                var value = prompt('> ');
                                if (value) {
                                    await loc.fill(String(value));
                                }
                                break;

                            case "wait":
                                if (step.selector) {
                                    await loc.isVisible();
                                } else {
                                    await page.waitForTimeout(Number(step.value));
                                }
                                break;

                            // Actions
                            case "edit":
                                const ve = String(step.value);
                                await loc.evaluate((node, ve) => node.innerText = ve, ve);
                                break;

                            case "replace":
                                const vr = step.value;
                                await loc.evaluate((node, vr) => node.innerHTML = vr, vr);
                                break;

                            case "style":
                                await page.addStyleTag({ content: step.value });
                                break;

                            case "snap":
                                // Join page, operation, and step names.
                                // Page and operation names may have trailing slash (to create image sub directory).
                                // These are concatenated as-is. Otherwise, add a space, which is replaced later by the separator char.
                                // Any may be empty.
                                let fn =
                                    (pg.name ? (pg.name.slice(-1) == '/' ? pg.name : pg.name + ' ') : '') +
                                    (op.name ? (op.name.slice(-1) == '/' ? op.name : op.name + ' ') : '') +
                                    (step.name ? step.name : '');

                                // If loop present, add number suffix.
                                if (op.loop) {
                                    fn = [fn, n].join(settings.sep);
                                }

                                await snap(loc, path.join(dir, fn), step.options, settings);
                                break;

                            default:
                                console.log(`      Step type '${step.type}' not recognized`);
                                break;
                        }
                    } catch (e) {
                        console.log(`ERROR: ${e}`);
                    }
                    if (step.viewport) {
                        console.log(`        Reset viewport for step: ${current_step_vp.width}x${current_step_vp.height}`);
                        await viewport(page, current_step_vp, instance.wait);
                    }
                } // for step
                if (op.viewport) {
                    console.log(`    Reset viewport for operation: ${current_operation_vp.width}x${current_operation_vp.height}`);
                    await viewport(page, current_operation_vp, instance.wait);
                }
            } // operations loop
        } // for operations
        if (pg.viewport) {
            console.log(`  Reset viewport for page: ${current_page_vp.width}x${current_page_vp.height}`);
            await viewport(page, current_page_vp, instance.wait);
        }
    } // for pages
    if (settings.trace) {
        await context.tracing.stop({ path: trace_file });
    }
    await context.close();
    await browser.close();
})();

/*
** Convenience wrapper for screenshots, and where the image filename is built.
** Note, 'page' might be a locator.
*/
// Increment screenshot file names
var idx = 1;
async function snap(loc, full_path, options, settings) {
    const directory = path.dirname(full_path);
    let filename = path.basename(full_path);

    // Attach sequence number and prefix to filename
    // Replace space, dot, backslash with sep char
    // (Extension added later)
    filename = [
        (settings.seq ? pad(idx++) : null),
        (settings.pfx ? settings.pfx : null),
        filename.replace(/[\. \\]/g, settings.sep)
    ].filter(function (a) { return a != null; })
        .join(settings.sep);

    // JPG options
    if (settings.ext == '.jpg') {
        options = {
            ...options,
            ...{
                type: 'jpeg',
                quality: settings.jpg_quality
            }
        }
    }

    const screenshot_file = path.join(directory, filename);
    // Screenshot filename and extension
    options = {
        ...options,
        ...{
            path: screenshot_file + settings.ext
        }
    }

    try {
        await loc.screenshot(options);
    } catch (err) {
        console.error(`Failed to save image ${err}`);
        return;
    }

    if (options.crop) {
        console.log(`Cropping with options ${options.crop}`);
        sharp(options.path)
        .extract({
            left: options.crop.left * settings.scale,
            top: options.crop.top * settings.scale,
            height: options.crop.height * settings.scale,
            width: options.crop.width * settings.scale
    })
        .toFile(screenshot_file + '_CROP' + settings.ext);
    }
}

/*
** Zero-pad filename increment integer
*/
function pad(n, w = 3, z = '0') { // number, width, padding char
    n = String(n);
    return n.length >= w ? n : new Array(w - n.length + 1).join(z) + n;
}

/*
** Convenience viewport setter (with reload option)
*/
async function viewport(page, viewport, timeout = 0, reload = false) {
    try {
        await page.setViewportSize({
            width: viewport.width,
            height: viewport.height
        });
        if (reload) { // some pages need reloading after the viewport is changed
            console.log(`Reloading (timeout=${timeout / 1000})`);
            await page.reload({
                waitUntil: 'load',
                timeout: timeout
            });
        }
    } catch (e) {
        console.error(`Failed setting viewport - ${e}`);
    }
}

/*
** Create images directories
*/
function mkdir(dir) {
    if (!fs.existsSync(dir)) {
        try {
            console.log("Creating image save directory: " + dir);
            fs.mkdirSync(dir, { recursive: true });
        }
        catch (err) {
            console.error("Failed to create image save directory " + dir);
            return;
        }
    } else {
        console.log("Image save directory: " + dir + " (already exists)");
    }
}
