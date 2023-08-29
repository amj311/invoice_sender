const axios = require("axios");
const express = require("express");
require('dotenv').config();
const { sendLatestInvoice } = require("./sendLatestInvoice");

const app = express();

app.listen(process.env.PORT || 3000, ()=>{
	console.log('Server is ready!');
})

app.post('/send-latest-invoice', async (req, res) => {
	console.log("\n\nNew request!", req.query)
	let { companyId, sendTo, test } = req.query;

	// For safety, consider this a test unless specifically set to false
	test = Boolean(test !== 'false');
	
	try {
		const details = await sendLatestInvoice(companyId, sendTo, test);
		console.log("Success.")
		console.log(details)
		res.status(200).json({message: 'Successfully sent invoice!', details});
	}
	catch(e) {
		console.log(e);
		res.status(500).json({error: e.message || e, message: 'Failed to send invoice'});
	}

})
