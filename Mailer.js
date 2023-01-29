const mailgun = require("mailgun-js");

module.exports = class Mailer {

  constructor(config) {
    this.config(config);
  }

  config(config) {
    this.domain = config.domain || this.domain;
    this.apiKey = config.apiKey || this.apiKey;
    this.sender = config.sender || this.sender;
    this.mg = mailgun({apiKey: this.apiKey, domain: this.domain});
  }

  send(props, handler) {
    let from = props.from || this.sender;
    let { to, subject, text, html } = props;
    let data = { from, to, subject, text, html };
    this.mg.messages().send(data, handler);
  }
  
}
