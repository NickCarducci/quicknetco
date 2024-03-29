const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET); //("sk_test_4eC39HqLyjWDarjtT1zdp7dc");

const OAuthClient = require("intuit-oauth"),
  port = 8080,
  allowedOrigins = ["https://quick.net.co", "https://se1dt7.csb.app"], //Origin: <scheme>://<hostname>:<port>
  RESSEND = (res, e) => {
    res.send(e);
    //res.end();
  },
  refererOrigin = (req, res) => {
    var origin = req.query.origin;
    if (!origin) {
      origin = req.headers.origin;
      //"no newaccount made body",  //...printObject(req) //: origin + " " + (storeId ? "storeId" : "")
    }
    return origin;
  },
  allowOriginType = (origin, res) => {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", ["POST", "OPTIONS", "GET"]);
    res.setHeader("Access-Control-Allow-Headers", [
      "Content-Type",
      "Access-Control-Request-Method",
      "Access-Control-Request-Methods",
      "Access-Control-Request-Headers"
    ]);
    //if (res.secure) return null;
    //allowedOrigins[allowedOrigins.indexOf(origin)]
    res.setHeader("Allow", ["POST", "OPTIONS", "GET"]);
    res.setHeader("Content-Type", "Application/JSON");
    var goAhead = true;
    if (!goAhead) return true;
    //if (!res.secure) return true;
    //https://stackoverflow.com/questions/12027187/difference-between-allow-and-access-control-allow-methods-in-http-response-h
  },
  preflight = (req, res) => {
    const origin = req.headers.origin;
    app.use(cors({ origin })); //https://stackoverflow.com/questions/36554375/getting-the-req-origin-in-express
    if (
      [...allowedOrigins, req.body.payingDomains].indexOf(
        req.headers.origin
      ) === -1
    )
      return RESSEND(res, {
        statusCode: 401,
        error: "no access for this origin- " + req.headers.origin
      });
    if (allowOriginType(req.headers.origin, res))
      return RESSEND(res, {
        statusCode,
        statusText: "not a secure origin-referer-to-host protocol"
      });
    //"Cannot setHeader headers after they are sent to the client"

    res.statusCode = 204;
    RESSEND(res); //res.sendStatus(200);
  },
  //const printObject = (o) => Object.keys(o).map((x) => {return {[x]: !o[x] ? {} : o[x].constructor === Object ? printObject(o[x]) : o[x] };});
  standardCatch = (res, e, extra, name) => {
    RESSEND(res, {
      statusCode: 402,
      statusText: "no caught",
      name,
      error: e,
      extra
    });
  },
  timeout = require("connect-timeout"),
  fetch = require("node-fetch"),
  express = require("express"),
  app = express(),
  attach = express.Router(),
  cors = require("cors");
//FIREBASEADMIN = FIREBASEADMIN.toSource(); //https://dashboard.stripe.com/account/apikeys

app.use(timeout("5s"));
//catches ctrl+c event
process.on("SIGINT", exitHandler.bind(null, { exit: true }));
// catches "kill pid" (for example: nodemon restart)
process.on("SIGUSR1", exitHandler.bind(null, { exit: true }));
process.on("SIGUSR2", exitHandler.bind(null, { exit: true }));
//https://stackoverflow.com/questions/14031763/doing-a-cleanup-action-just-before-node-js-exits
//http://johnzhang.io/options-req-in-express
//var origin = req.get('origin');

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

var statusCode = 200,
  statusText = "ok";
//https://support.stripe.com/questions/know-your-customer-(kyc)-requirements-for-connected-accounts

const nonbody = express
  .Router()
  .get("/", (req, res) => res.status(200).send("shove it"))
  .options("/*", preflight);
attach
  .post("/deletesubscription", async (req, res) => {
    var origin = refererOrigin(req, res);
    if (!req.body || allowOriginType(origin, res))
      return RESSEND(res, {
        statusCode,
        statusText,
        progress: "yet to surname factor digit counts.."
      });

    const subscription = await stripe.subscriptions
      .cancel(req.body.subscriptionId)
      .catch((e) => {
        standardCatch(res, e, {}, "subscription (delete callback)");
      });
    if (!subscription)
      return RESSEND(res, {
        statusCode,
        statusText,
        error: "no go subscription delete"
      });
    const configuration = new Configuration({
      basePath: req.body.subscriptionId
        ? PlaidEnvironments.development
        : PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
          "PLAID-SECRET": req.body.subscriptionId
            ? process.env.PLAID_SECRET
            : process.env.PLAID_SECRET_DEV,
          "Plaid-Version": "2020-09-14"
        }
      }
    });
    const plaidClient = new PlaidApi(configuration);
    req.body.access_tokens.forEach(async (access_token) => {
      const remove_response = await plaidClient.itemRemove({
        access_token
      });
      if (!remove_response)
        return RESSEND(res, {
          statusCode,
          statusText,
          error: "no go remove_response delete"
        });
    });
    RESSEND(res, {
      statusCode,
      statusText,
      subscription
    });
  })
  .post("/subscribe", async (req, res) => {
    var origin = refererOrigin(req, res);
    if (!req.body || allowOriginType(origin, res))
      return RESSEND(res, {
        statusCode,
        statusText,
        progress: "yet to surname factor digit counts.."
      });

    // create a stripe customer
    const customer = await stripe.customers
      .create({
        name: req.body.name,
        email: req.body.email,
        payment_method: req.body.paymentMethod,
        invoice_settings: {
          default_payment_method: req.body.paymentMethod
        }
      })
      .catch((e) => {
        standardCatch(res, e, {}, "customer (create callback)");
      });

    // get the price id from the front-end
    const priceId = req.body.priceId;

    // create a stripe subscription
    const subscription = await stripe.subscriptions
      .create({
        customer: customer.id,
        items: [{ price: priceId }],
        payment_settings: {
          payment_method_options: {
            card: {
              request_three_d_secure: "any"
            }
          },
          payment_method_types: ["card"],
          save_default_payment_method: "on_subscription"
        },
        cancel_at_period_end: false,
        expand: ["latest_invoice.payment_intent"]
      })
      .catch((e) => {
        standardCatch(res, e, {}, "subscription (create callback)");
      });
    /*const configuration = new Configuration({
      basePath: PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
          "PLAID-SECRET": process.env.PLAID_SECRET,
          "Plaid-Version": "2020-09-14"
        }
      }
    });
    const plaidClient = new PlaidApi(configuration);
    const subscription_response = await plaidClient.transferRecurringCreate({
      access_token: req.body.access_token
    });*/
    if (!subscription.id)
      return RESSEND(res, {
        statusCode,
        statusText,
        error: "no go subscription by plaidClient"
      });
    RESSEND(res, {
      statusCode,
      statusText,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      subscription: subscription.id
    });
  })
  .post("/addpurchase", async (req, res) => {
    var origin = refererOrigin(req, res);
    if (!req.body || allowOriginType(origin, res))
      return RESSEND(res, {
        statusCode,
        statusText,
        progress: "yet to surname factor digit counts.."
      });

    const oauthClient = new OAuthClient({
      clientId: process.env.QBA_ID,
      clientSecret: process.env.QBA_SECRET,
      environment: "production",
      redirectUri: origin //"https://scopes.cc"
      //logging: true
    });
    //var companyID = oauthClient.getToken().realmId;

    var url =
      oauthClient.environment === "sandbox"
        ? OAuthClient.environment.sandbox
        : OAuthClient.environment.production;
    const companyID = req.body.companyIDToken.split(":")[0];

    const purchase = await oauthClient.makeApiCall({
      url: url + "v3/company/" + companyID + "/purchase",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.body.companyIDToken.split(":")[1]}`
      },
      body: JSON.stringify(req.body.purchase)
    });
    if (!purchase)
      return RESSEND(res, {
        statusCode,
        statusText,
        error: "no go purchase by oauth"
      });
    RESSEND(res, {
      statusCode,
      statusText,
      purchase
    });
  })
  .post("/purchases", async (req, res) => {
    var origin = refererOrigin(req, res);
    if (!req.body || allowOriginType(origin, res))
      return RESSEND(res, {
        statusCode,
        statusText,
        progress: "yet to surname factor digit counts.."
      });

    const oauthClient = new OAuthClient({
      clientId: process.env.QBA_ID,
      clientSecret: process.env.QBA_SECRET,
      environment: "production",
      redirectUri: origin //"https://scopes.cc"
      //logging: true
    });
    //var companyID = oauthClient.getToken().realmId;

    var url =
      oauthClient.environment === "sandbox"
        ? OAuthClient.environment.sandbox
        : OAuthClient.environment.production;
    const companyID = req.body.companyIDToken.split(":")[0];

    const selectAccount =
      "select * from Purchase where Line contains AccountBasedExpenseLineDetail.CustomerRef AND " +
      `Metadata.CreateTime > '${req.body.start_date}' AND Metadata.CreateTime < '${req.body.end_date}'`;
    const purchases = await oauthClient.makeApiCall({
      url:
        url +
        "v3/company/" +
        companyID +
        "/query?query=" +
        selectAccount +
        "&minorversion=65",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.body.companyIDToken.split(":")[1]}`
      },
      body: JSON.stringify({})
    });
    if (!purchases)
      return RESSEND(res, {
        statusCode,
        statusText,
        error: "no go purchases by oauth"
      });
    RESSEND(res, {
      statusCode,
      statusText,
      purchases
    });
  })
  .post("/quickbooksinfo", async (req, res) => {
    var origin = refererOrigin(req, res);
    if (!req.body || allowOriginType(origin, res))
      return RESSEND(res, {
        statusCode,
        statusText,
        progress: "yet to surname factor digit counts.."
      });

    const oauthClient = new OAuthClient({
      clientId: process.env.QBA_ID,
      clientSecret: process.env.QBA_SECRET,
      environment: "production",
      redirectUri: origin //"https://scopes.cc"
      //logging: true
    });
    //var companyID = oauthClient.getToken().realmId;

    var url =
      oauthClient.environment === "sandbox"
        ? OAuthClient.environment.sandbox
        : OAuthClient.environment.production;

    const companyInfo = await oauthClient.makeApiCall({
      url:
        url +
        "v3/company/" +
        req.body.companyIDToken.split(":")[0] +
        //companyID + //"/companyinfo/" + companyID
        "/query?query=select * from CompanyInfo",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.body.companyIDToken.split(":")[1]}`
      },
      body: JSON.stringify({})
    });
    if (!companyInfo)
      return RESSEND(res, {
        statusCode,
        statusText,
        error: "no go companyInfo by api"
      });
    RESSEND(res, {
      statusCode,
      statusText,
      companyInfo
    });
  })
  .post("/quickbookscustomer", async (req, res) => {
    var origin = refererOrigin(req, res);
    if (!req.body || allowOriginType(origin, res))
      return RESSEND(res, {
        statusCode,
        statusText,
        progress: "yet to surname factor digit counts.."
      });

    const oauthClient = new OAuthClient({
      clientId: process.env.QBA_ID,
      clientSecret: process.env.QBA_SECRET,
      environment: "production",
      redirectUri: origin //"https://scopes.cc"
      //logging: true
    });
    //var companyID = oauthClient.getToken().realmId;

    var url =
      oauthClient.environment === "sandbox"
        ? OAuthClient.environment.sandbox
        : OAuthClient.environment.production;
    const companyID = req.body.companyIDToken.split(":")[0];

    //"Using iterators to page through results"
    const selectAccount =
      "select * from Account order by Id startposition " +
      req.body.offset +
      " maxresults 1000";
    //(req.body.iteratorId ? " iterator " + req.body.iteratorId : ""); //where Metadata.CreateTime > '2014-12-31'"; // AND Classification = 'Expense'";
    const accounts = await oauthClient.makeApiCall({
      url:
        url +
        "v3/company/" +
        companyID +
        "/query?query=" +
        selectAccount +
        "&minorversion=65",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.body.companyIDToken.split(":")[1]}`
      },
      body: JSON.stringify({})
    });
    if (!accounts)
      return RESSEND(res, {
        statusCode,
        statusText,
        error: "no go accounts by oauth"
      });

    /*"select * from vendor " +
      "order by Metadata.CreateTime iteratorId " +
      60 * req.body.iteratorId +
      " rows";*/
    const selectVendor =
      "select * from vendor order by Id startposition " +
      req.body.offset +
      " maxresults 1000";
    const vendors = await oauthClient.makeApiCall({
      url:
        url +
        "v3/company/" +
        companyID +
        "/query?query=" +
        selectVendor +
        "&minorversion=65",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.body.companyIDToken.split(":")[1]}`
      },
      body: JSON.stringify({})
    });
    if (!vendors)
      return RESSEND(res, {
        statusCode,
        statusText,
        error: "no go vendors by oauth"
      });
    const selectCustomer =
      "select * from Customer order by Id startposition " +
      req.body.offset +
      " maxresults 1000";
    //https://help.developer.intuit.com/s/question/0D5G000004Dk6tOKAR/why-select-from-invoice-where-id-46-startposition-0-maxresults-5002-got-validationexception-invalid-query-any-help-appreciated
    const customers = await oauthClient.makeApiCall({
      url:
        url +
        "v3/company/" +
        companyID +
        "/query?query=" +
        selectCustomer +
        "&minorversion=65",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.body.companyIDToken.split(":")[1]}`
      },
      body: JSON.stringify({})
    });
    if (!customers)
      return RESSEND(res, {
        statusCode,
        statusText,
        error: "no go customers by oauth"
      });
    RESSEND(res, {
      statusCode,
      statusText,
      accounts,
      vendors,
      customers
    });
  })
  .post("/quickbookscallback", async (req, res) => {
    var origin = refererOrigin(req, res);
    if (!req.body || allowOriginType(origin, res))
      return RESSEND(res, {
        statusCode,
        statusText,
        progress: "yet to surname factor digit counts.."
      });
    const oauthClient = new OAuthClient({
      clientId: process.env.QBA_ID,
      clientSecret: process.env.QBA_SECRET,
      environment: "production",
      redirectUri: origin //"https://scopes.cc"
      //logging: true
    });
    if (!oauthClient.authorizeUri)
      return RESSEND(res, {
        statusCode,
        statusText,
        error: "no go oauthClient new"
      });
    const authResponse = await oauthClient.createToken(req.body.url);

    if (!authResponse)
      return RESSEND(res, {
        statusCode,
        statusText,
        error: "no go authResponse by oauth"
      });
    const quickbooks_token = authResponse.getJson();
    //const quickbooks_token = JSON.stringify(authResponse.getJson(), null, 2);
    if (!quickbooks_token)
      return RESSEND(res, {
        statusCode,
        statusText,
        error: "no go quickbooks_token by authResponse.getJson"
      });
    var companyIDToken =
      oauthClient.getToken().realmId + ":" + quickbooks_token.access_token;

    if (!companyIDToken)
      return RESSEND(res, {
        statusCode,
        statusText,
        error: "no go companyIDToken by realmId"
      });
    RESSEND(res, {
      statusCode,
      statusText,
      companyIDToken
    });
  })
  .post("/quickbooks", async (req, res) => {
    var origin = refererOrigin(req, res);
    if (!req.body || allowOriginType(origin, res))
      return RESSEND(res, {
        statusCode,
        statusText,
        progress: "yet to surname factor digit counts.."
      });
    const oauthClient = new OAuthClient({
      clientId: process.env.QBA_ID,
      clientSecret: process.env.QBA_SECRET,
      environment: "production",
      redirectUri: origin //"https://scopes.cc"
      //logging: true
    });
    if (!oauthClient.authorizeUri)
      return RESSEND(res, {
        statusCode,
        statusText,
        error: "no go oauthClient new"
      });
    var authUri = oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting],
      state: "intuit-test"
    });
    //res.send(authUri);
    if (!authUri)
      return RESSEND(res, {
        statusCode,
        statusText,
        error: "no go authUri by oauth"
      });
    RESSEND(res, {
      statusCode,
      statusText,
      authUri,
      oauthClient
    });
  })
  .post("/link", async (req, res) => {
    var origin = refererOrigin(req, res);
    if (!req.body || allowOriginType(origin, res))
      return RESSEND(res, {
        statusCode,
        statusText,
        progress: "yet to surname factor digit counts.."
      });

    const configuration = new Configuration({
      basePath: req.body.subscriptionId
        ? PlaidEnvironments.development
        : PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
          "PLAID-SECRET": req.body.subscriptionId
            ? process.env.PLAID_SECRET
            : process.env.PLAID_SECRET_DEV,
          "Plaid-Version": "2020-09-14"
        }
      }
    });
    const plaidClient = new PlaidApi(configuration);
    const linkResponse = await plaidClient
      .linkTokenCreate({
        user: {
          client_user_id: process.env.PLAID_CLIENT_ID
        },
        client_name: "QuickNet",
        products: [
          //"auth",
          "transactions"
        ],
        country_codes: ["US"],
        language: "en",
        //webhook: "https://sample-web-hook.com",
        redirect_uri: "https://quick.net.co"
        /*account_filters: {
          depository: {
            account_subtypes: ["checking", "savings"]
          }
        }*/
      })
      .catch((e) => {
        standardCatch(res, e, {}, "link token (create callback)");
      });

    if (!linkResponse.data)
      return RESSEND(res, {
        statusCode,
        statusText,
        error: "no go linkResponse by plaidClient"
      });
    RESSEND(res, {
      statusCode,
      statusText,
      link_token: linkResponse.data.link_token
    });
  })
  .post("/plaid", async (req, res) => {
    var origin = refererOrigin(req, res);
    if (!req.body || allowOriginType(origin, res))
      return RESSEND(res, {
        statusCode,
        statusText,
        progress: "yet to surname factor digit counts.."
      });

    const configuration = new Configuration({
      basePath: req.body.subscriptionId
        ? PlaidEnvironments.development
        : PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
          "PLAID-SECRET": req.body.subscriptionId
            ? process.env.PLAID_SECRET
            : process.env.PLAID_SECRET_DEV,
          "Plaid-Version": "2020-09-14"
        }
      }
    });
    const plaidClient = new PlaidApi(configuration);
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: req.body.public_token
    });
    if (!response.data.access_token)
      return RESSEND(res, {
        statusCode,
        statusText,
        error: "no go access_token by plaidClient"
      });
    RESSEND(res, {
      statusCode,
      statusText,
      access_token: response.data.access_token
    });
  })
  .post("/transactions", async (req, res) => {
    var origin = refererOrigin(req, res);
    if (!req.body || allowOriginType(origin, res))
      return RESSEND(res, {
        statusCode,
        statusText,
        progress: "yet to surname factor digit counts.."
      });

    const configuration = new Configuration({
      basePath: req.body.subscriptionId
        ? PlaidEnvironments.development
        : PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
          "PLAID-SECRET": req.body.subscriptionId
            ? process.env.PLAID_SECRET
            : process.env.PLAID_SECRET_DEV,
          "Plaid-Version": "2020-09-14"
        }
      }
    });
    const plaidClient = new PlaidApi(configuration);
    const transactions_response = await plaidClient.transactionsGet({
      access_token: req.body.access_token,
      start_date: req.body.start_date,
      end_date: req.body.end_date
    });
    if (!transactions_response.data.transactions)
      return RESSEND(res, {
        statusCode,
        statusText,
        error: "no go transactionsGet by plaidClient"
      });
    const oauthClient = new OAuthClient({
      clientId: process.env.QBA_ID,
      clientSecret: process.env.QBA_SECRET,
      environment: "production",
      redirectUri: origin //"https://scopes.cc"
      //logging: true
    });
    //var companyID = oauthClient.getToken().realmId;

    var url =
      oauthClient.environment === "sandbox"
        ? OAuthClient.environment.sandbox
        : OAuthClient.environment.production;
    const companyID = req.body.companyIDToken.split(":")[0];

    const selectPurchases =
      "select * from Purchase where " +
      `Metadata.CreateTime > '${req.body.start_date}' AND Metadata.CreateTime < '${req.body.end_date}'`;
    const purchases = await oauthClient.makeApiCall({
      url:
        url +
        "v3/company/" +
        companyID +
        "/query?query=" +
        selectPurchases +
        "&minorversion=65",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.body.companyIDToken.split(":")[1]}`
      },
      body: JSON.stringify({})
    });
    if (!purchases)
      return RESSEND(res, {
        statusCode,
        statusText,
        error: "no go purchases by oauth"
      });
    RESSEND(res, {
      statusCode,
      statusText,
      transactions: transactions_response.data.transactions,
      purchases
    });
  })
  .post("/detail", async (req, res) => {
    var origin = refererOrigin(req, res);
    if (!req.body || allowOriginType(origin, res))
      return RESSEND(res, {
        statusCode,
        statusText,
        progress: "yet to surname factor digit counts.."
      });

    const configuration = new Configuration({
      basePath: req.body.subscriptionId
        ? PlaidEnvironments.development
        : PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
          "PLAID-SECRET": req.body.subscriptionId
            ? process.env.PLAID_SECRET
            : process.env.PLAID_SECRET_DEV,
          "Plaid-Version": "2020-09-14"
        }
      }
    });
    const plaidClient = new PlaidApi(configuration);
    const detail_response = await plaidClient.itemGet({
      access_token: req.body.access_token
    }); //https://plaid.com/docs/api/items/#itemget
    const detaile_response = await plaidClient.institutionsGetById({
      institution_id: detail_response.data.item.institution_id,
      country_codes: ["US"]
    }); //https://plaid.com/docs/api/institutions/#institutionsget
    if (!detaile_response.data)
      return RESSEND(res, {
        statusCode,
        statusText,
        error: "no go detail by plaidClient"
      });
    RESSEND(res, {
      statusCode,
      statusText,
      detail: detaile_response.data
    });
  })
  .post("/remove", async (req, res) => {
    var origin = refererOrigin(req, res);
    if (!req.body || allowOriginType(origin, res))
      return RESSEND(res, {
        statusCode,
        statusText,
        progress: "yet to surname factor digit counts.."
      });

    const configuration = new Configuration({
      basePath: req.body.subscriptionId
        ? PlaidEnvironments.development
        : PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
          "PLAID-SECRET": req.body.subscriptionId
            ? process.env.PLAID_SECRET
            : process.env.PLAID_SECRET_DEV,
          "Plaid-Version": "2020-09-14"
        }
      }
    });
    const plaidClient = new PlaidApi(configuration);
    const remove_response = await plaidClient.itemRemove({
      access_token: req.body.access_token
    });
    if (!remove_response.data)
      return RESSEND(res, {
        statusCode,
        statusText,
        error: "no go removal by plaidClient"
      });
    RESSEND(res, {
      statusCode,
      statusText,
      removal: remove_response.data
    });
  });
//https://stackoverflow.com/questions/31928417/chaining-multiple-pieces-of-middleware-for-specific-route-in-expressjs
app.use(nonbody, attach); //methods on express.Router() or use a scoped instance
app.listen(port, () => console.log(`localhost:${port}`));
process.stdin.resume(); //so the program will not close instantly
function exitHandler(exited, exitCode) {
  if (exited) {
    console.log("clean");
  }
  if (exitCode || exitCode === 0) console.log(exitCode);
  if (exited.mounted) process.exit(); //bind-only not during declaration
} //bind declare (this,update) when listened on:
process.on("uncaughtException", exitHandler.bind(null, { mounted: true }));
process.on("exit", exitHandler.bind(null, { clean: true }));
function errorHandler(err, req, res, next) {
  console.log("Oops", err);
}
app.use(errorHandler);
