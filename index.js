const axios = require("axios");
const express = require("express");
const Mailer = require("./Mailer");
require('dotenv').config();

const app = express();

app.listen(process.env.PORT || 3000, ()=>{
	console.log('Server is ready!');
})

app.post('/send-latest-invoice', async (req, res) => {
	console.log("Sending invoice!")
	try {
		await sendLatestInvoice();
		res.status(200).json({message: 'Successfully sent invoice!'});
	}
	catch(e) {
		console.log(e);
		res.status(500).json({error: e.message || e, message: 'Failed to send invoice'});
	}

})

let avazaApi = axios.create({
    baseURL: 'https://api.avaza.com/api/',
    headers: { "Authorization": "Bearer " + process.env.AVAZA_TOKEN },
});

const mailer = new Mailer({
	domain: process.env.MAIL_DOMAIN,
	apiKey: process.env.MAIL_API_KEY,
	sender: process.env.MAIL_DEFAULT_SENDER,
})

const formatDate = (ts) => {
	return new Date(ts).toDateString();
}

const formatDollar = (num) => {
	return new Intl.NumberFormat(`en-US`, {
		currency: `USD`,
		style: 'currency',
	}).format(num);
}

const sendLatestInvoice = async () => {
	const { status, data } = await avazaApi.get('Invoice?pageSize=1&pageNumber=1&Sort=InvoiceNumber');
	if (status !== 200) {
		throw new Error("Could not get invoices");
	}
	const { Invoices: { 0: invoice} } =  data;

	console.log('Got invoice #' + invoice.InvoiceNumber);

	if (invoice.DateSent) {
		console.log("Invoice was already sent on " + formatDate(invoice.DateSent));
	}

    let msg = {
		to: process.env.MAIL_RECEIVER,
		subject: "Arthur Judd Invoice #" + invoice.InvoiceNumber,
		html: `
			<p>A new invoice from Arthur Judd is ready for you.</p>
		
			<table style="text-align: left; border-spacing: 10px;">
				<tr>
					<th>Invoice</th>
					<td>${invoice.InvoiceNumber}</td>
				</tr>
				<tr>
					<th>Date Issued</th>
					<td>${formatDate(invoice.DateIssued)}</td>
				</tr>
				<tr>
					<th>Amount Due</th>
					<td>${formatDollar(invoice.TotalAmount)}</td>
				</tr>
			</table>
		
			<br/>
		
			<a
				style="
					background: #0bf;
					color: white;
					display: inline-block;
					padding: 7px;
					font-size: 16px;
					border-radius: 2px;
					cursor: pointer;
					text-decoration: none;
				"
				href="${invoice.Links.ClientView}"
			>
				View Invoice
			</a>
		`
	}
  
	await mailer.send(msg, (error, body) => {
		if (error) {
			throw error;
		}
		console.log("Sent email:", body)
	})
}
