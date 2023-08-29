const { sendLatestInvoice } = require("../sendLatestInvoice");

const config = {
    test: true,
    sendTo: null,
}

const [cmd, file, ...args] = process.argv;

args.forEach(arg => {
    const [key, value] = arg.split('=');
    if (!key || !value) return;
    config[key] = value;
})

console.log(config);

(async () => {
    const res = await sendLatestInvoice(null, config.sendTo, config.test === 'false' ? false : true);
    console.log(res);
})();
