const axios = require("axios");
const express = require("express");
require('dotenv').config();

const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

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

let avazaApi = axios.create({
    baseURL: 'https://api.avaza.com/api/',
    headers: { "Authorization": "Bearer " + process.env.AVAZA_TOKEN },
});

const formatDate = (ts) => {
	return new Date(ts).toDateString();
}

const formatDollar = (num) => {
	return new Intl.NumberFormat(`en-US`, {
		currency: `USD`,
		style: 'currency',
	}).format(num);
}

const sendLatestInvoice = async ( companyId, sendToOverride, test ) => {
	const info = [];
	const { status, data } = await avazaApi.get('Invoice?pageSize=1&pageNumber=1&Sort=InvoiceNumber');
	if (status !== 200) {
		throw new Error("Could not get invoices");
	}
	const { Invoices: { 0: invoice} } = data;

	info.push('Got invoice #' + invoice.InvoiceNumber);

	if (invoice.DateSent) {
		info.push("Invoice was already sent on " + formatDate(invoice.DateSent));
	}

	// Unless a recipient override has been given, lookup designated contact
	let contact = null;
	if (!sendToOverride) {
		try {
			const res = await avazaApi.get('Contact?CompanyIDFK=' + invoice.CompanyIDFK);
			if (res.status !== 200) {
				console.error("Could not get contacts!", res);
			}
			const { Contacts } = res.data;
			contact = Contacts.find(c => c.PositionTitle === 'invoice_receiver');
			info.push('Found contact by company position: ' + contact.Email)
		}
		catch (e) {
			console.error(e);
			info.push('Error when looking up contact: ' + e.message)
		}
	}

	let to = sendToOverride || (contact.Email) || process.env.MAIL_BCC;
	info.push('Determined recipient: ' + to);
	if (test) {
		to = process.env.MAIL_BCC;
		info.push('Overriding recipient because this is a test');
	}
	let bcc = (to !== process.env.MAIL_BCC) ? process.env.MAIL_BCC : undefined;

	const msg = {
		to,
		bcc,
		from: process.env.MAIL_DEFAULT_SENDER,
		subject: "Arthur Judd Invoice #" + invoice.InvoiceNumber,
		text: `
			${ test ? `THIS IS A TEST` : ''}
			${ contact ? `Hi ${contact.Firstname},` : ''}
			An invoice from Arthur Judd is ready for you.
			
			Subject: ${invoice.Subject}
			Invoice #: ${invoice.Subject}
			Date: ${formatDate(invoice.DateIssued)}
			Amount Due: ${formatDollar(invoice.TotalAmount)}

			View invoice: ${invoice.Links.ClientView}
		`,
		html: `
			${ test ? `<p>THIS IS A TEST</p>` : ''}
			${ contact?.Firstname ? `<p>Hi ${contact.Firstname},</p>` : ''}
			<p>An invoice from Arthur Judd is ready for you.</p>
		
			<table style="text-align: left; border-spacing: 10px;">
				<tr>
					<th>Subject</th>
					<td>${invoice.Subject}</td>
				</tr>
				<tr>
					<th>Invoice #</th>
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
					padding: 10px 15px;
					font-size: 16px;
					border-radius: 2px;
					cursor: pointer;
					text-decoration: none;
				"
				href="${invoice.Links.ClientView}"
			>
				View Invoice
			</a>

			<p>
				Click the button above to view the full invoice, or copy and paste this link into your browser:
				<br/>
				<a href="${invoice.Links.ClientView}">${invoice.Links.ClientView}</a>
			</p>
		`
	}

	try {
		await sgMail.send(msg);
		const details = {
			test,
			sentTo: to,
			bcc: bcc || "No BCC",
			invoice: invoice.InvoiceNumber,
			info
		};
		return details;
	}
	catch(e) {
		console.error(e.response.body.errors);
		throw new Error("Error sending email!")
	}
}
