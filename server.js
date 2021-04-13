require('isomorphic-fetch');
const dotenv = require('dotenv');
dotenv.config();
const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
const app = express();
const crypto = require('crypto');
const Shopify = require('shopify-api-node');
const removeRegisteredOrdersWebhook = require('./services/removeRegisteredOrdersWebhook');

const {
  SHOPIFY_API_KEY,
	SHOPIFY_API_PASSWORD,
	SHOPIFY_SECRET_KEY,
	SHOPNAME,
	HOST
} = process.env;

const shopify = new Shopify({
  shopName: SHOPNAME,
  apiKey: SHOPIFY_API_KEY,
	password: SHOPIFY_API_PASSWORD
});

const verifyWebhook = ( req, res, next ) => {
	// We'll compare the hmac to our own hash
	//const hmac = req.get('X-Shopify-Hmac-Sha256');
	const hmac = req.header('X-Shopify-Hmac-Sha256');

  // Create a hash using the body and our key
  const hash = crypto
    .createHmac('sha256', SHOPIFY_SECRET_KEY)
		.update(req.body.toString())
    .digest('base64');

  // Compare our hash to Shopify's hash
  if ( hash === hmac ) {
		// It's a match! All good
		console.log('Phew, it came from Shopify!');
		next();
  } else {
		// No match! This request didn't originate from Shopify
		console.log('Danger! Not from Shopify!');
		next(new Error('Not from Shopify!'));
	}
}

app.use(bodyParser.raw({type: 'application/json'}));
app.use(bodyParser.urlencoded({
	extended: true
}));

router.get('/', (req, res) => {
  res.send('Hello World!');
});

router.get('/register-order-webhooks', async (req, res) => {
	const webhookResult = await shopify.webhook.list();

 	await removeRegisteredOrdersWebhook(webhookResult);

	await shopify.webhook.create({
		topic: "orders/create",
		address: `${HOST}/webhooks/orders/create`,
		format: "json"
	});
	console.log('qwer');
	const result = await shopify.webhook.list();
	res.send(result);
});

// router.get('/udpate-order-test', async (req, res) => {
// 	const orderId = 3721036824736;
// 	const result = shopify.order.update(orderId, { id: orderId, phone: "+1 514-555-1111"})
// 	console.log(result);
// 	res.send(result);
// });


router.get('/remove-order-webhooks', async (req, res) => {
	const webhookResult = await shopify.webhook.list();
	await removeRegisteredOrdersWebhook(webhookResult);
	const result = await shopify.webhook.list();
	res.send(result);
});


router.post('/webhooks/orders/create', verifyWebhook, async (req, res) => {
	const data = req.body.toString();
	const orderData = JSON.parse(data);
	const orderId = orderData.id;

	//orderData.shipping_address.phone = "+1 514-555-7777";

	if ( orderData.shipping_address.phone !== null && orderData.phone === null ) {
		console.log(orderData.shipping_address.phone);
		shopify.order.update(orderId, { id: orderId, phone: orderData.shipping_address.phone })
		.then((orderData) => {
			console.log('success');
		})
		.catch((err) => console.error(err));
	}
	// if ( orderData.customer.default_address.phone !== null && orderData.phone === null ) {
	// 	shopify.order.update(orderId, { id: orderId, phone: orderData.shipping_address.phone })
	// 	.then((orderData) => {
	// 		console.log('success');
	// 	})
	// 	.catch((err) => console.error(err));
	// }
	if ( orderData.shipping_address.phone === null && orderData.phone !== null ) {
		shopify.order.update(orderId, { id: orderId, shipping_address: { phone: orderData.phone } })
		.then((orderData) => {
			console.log('success');
		})
		.catch((err) => console.error(err));
	}

	res.sendStatus(200);
});

app.use('/', router);

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
