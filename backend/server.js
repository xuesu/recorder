const express = require("express");
const path = require("path");
// use body parse for parsing POST request
const bodyParser = require("body-parser");
const morgan = require('morgan')
const app = express();
const helmet = require("helmet");
const bindLocalStorage = require("./data/bind_local");
const router = require("./router");

module.exports = function (host = "127.0.0.1", port = "9200"){
	app.use(helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'", host],
				scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
				scriptSrcAttr: ["'self'", "'unsafe-inline'"],
				fontSrc: ["'self'", "fonts.googleapis.com", "fonts.gstatic.com"],
				styleSrc: ["'self'", "fonts.googleapis.com", "'unsafe-inline'"],
				objectSrc: ["'none'"],
			}
		}
	}));
	app.use(morgan("tiny"));
	
	// scheduler sends application/x-www-form-urlencoded requests,
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(bodyParser.json());
	
	// you'll need these headers if your API is deployed on a different domain than a public page
	// in production system you could set Access-Control-Allow-Origin to your domains
	// or drop this expression - by default CORS security is turned on in browsers
	app.use(function(req, res, next) {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
		res.header("Access-Control-Allow-Methods", "*");
		console.log(req.path);
		next();
	});
	
	bindLocalStorage(app, router);
	
	app.use("/codebase", express.static(path.join(__dirname, "..", "codebase")));
	app.use("/pages", express.static(path.join(__dirname, "..", "pages")));
	app.use("/mmid_pack", express.static(path.join(__dirname, "..", "mmid_pack")));
	app.use(/^\/$/, function (req, res) {//default url
		res.redirect("/pages");
	});
	
	// start server
	app.listen(port, host, () => {
		console.log(`Open http://${host}:${port}/pages/ to start...`);
	});
}
