# Telegram Bot on Google Cloud Functions



### Prerequisites
* Goole Cloud account and a project. https://cloud.google.com/resource-manager/docs/creating-managing-projects
* Enable Google Cloud Functions and RuntimeConfig API from the API manager
* Get a telegram bot token, [ask it to the BotFather](https://telegram.me/BotFather)

#### Warning
Both Google Cloud Functions and RuntimeConfig are both still in beta.

### The token

```bash
# export for local testing 
export TELEGRAM_TOKEN=133545asdasd

# set the token as GC runtime configuration 
gcloud beta runtime-config configs create prod-config
gcloud beta runtime-config configs variables \
    set telegram/token  "$TELEGRAM_TOKEN" \
    --config-name prod-config
```

### The bot

```js
exports.echoBot = function(req, res){
    /*
     * When the request set the content-type header to application/json
     * the body of the request does not need to be parsed and is already
     * available as object.
     */
    const {message:{chat, text}} = req.body
    const echo = `echo: ${text}`

    return getToken()
        .then( token => request.post({
            uri: `https://api.telegram.org/bot${token}/sendMessage`,
            json: true,
            body: {text: echo, chat_id: chat.id}
        }))
        .then(resp => res.send(resp))
        .catch(err => res.status(500).send(err))
}

```
Just an easy bot that echos the received message.

### Retrieving the token

This function return a (promise) of a token either from the runtime config api when run online or from
an environment variable when run locally. The value is retrieved using 
[fredriks/cloud-functions-runtime-config](https://github.com/fredriks/cloud-functions-runtime-config) that wraps the api.
`NODE_ENV` is set to production when the function is run online, thus allow to discriminate in which environment
the function run.

```js
function getToken(){
    if (process.env.NODE_ENV == 'production'){
        return require('cloud-functions-runtime-config')
            .getVariable('prod-config', 'telegram/token')
    }
    return Promise.resolve(process.env.TELEGRAM_TOKEN)
}
```

### Local testing

Google provide a local emulator for Functions feature. It allow to local deploy a function to iterate
over it without having to deploy to the google server. It reload the code when changed on the file system
so it is not necessary to redeploy after the first time.

```
npm -g install @google-cloud/functions-emulator

functions start
functions deploy echoBot --trigger-http

curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
     "message": {
       "chat": {
         "id": 1232456
       },
       "text": "hello world"
     }
   }' \
   http://localhost:8010/litapp-165019/us-central1/echoBot

# To tail logs
watch functions logs read

```

### Deploying

Before deploy the function is required to create a Cloud Storage bucket where the function will be stored

```bash
gsutil mb gs://unique-bucket-name

gcloud beta functions deploy function_name \
  --trigger-http \
  --entry-point echoBot \
  --stage-bucket unique-bucket-name
```

### Set up the webhook

Deploying the function with the http trigger will return an url to trigger the function. The url would look
like `https://<GCP_REGION>-<PROJECT_ID>.cloudfunctions.net/function_name`. Use this url to set up a web hook
for your bot on telegram. You can check more information on webhook on the
[Telegram API documentation](https://core.telegram.org/bots/api#setwebhook)

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
     "url": "https://<GCP_REGION>-<PROJECT_ID>.cloudfunctions.net/function_name"
   }' \
   https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook
```
