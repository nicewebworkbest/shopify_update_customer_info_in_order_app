const Shopify = require('shopify-api-node');
const dotenv = require('dotenv');
dotenv.config();
const {
  SHOPIFY_API_KEY,
	SHOPIFY_API_PASSWORD,
	SHOPIFY_SECRET_KEY,
	SHOPNAME
} = process.env;

const shopify = new Shopify({
  shopName: SHOPNAME,
  apiKey: SHOPIFY_API_KEY,
	password: SHOPIFY_API_PASSWORD
});

const removeRegisteredOrdersWebhook = async (webhooks) => {
	for ( let index = 0; index < webhooks.length; index++ ) {
		if ( webhooks[index].topic == "orders/create" ) {
			await shopify.webhook.delete(webhooks[index].id);
		}
	}
};

module.exports = removeRegisteredOrdersWebhook;
