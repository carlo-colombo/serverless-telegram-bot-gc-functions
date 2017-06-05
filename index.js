const request = require('request-promise-native')

function getToken(){
    if (process.env.NODE_ENV == 'production'){
        return require('cloud-functions-runtime-config')
            .getVariable('prod-config', 'telegram/token')
    }
    return Promise.resolve(process.env.TELEGRAM_TOKEN)
}

exports.echoBot = function(req, res){
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
