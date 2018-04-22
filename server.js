// server.js
// where your node app starts

// init project
const express = require('express')
const chatfuelbroadcast = require('chatfuel-broadcast').default
const bodyParser = require('body-parser')
const multer = require('multer')
const url = require('url')
const upload = multer()
const app = express()

app.set('view engine', 'pug');
app.set('views','./views');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(upload.array()); 
// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'))

let createTextMsg = (text) => {
    if (text.constructor===Array)
    {
        let messages=[];
        let redirect_count=0;
        let redirect_to_blocks;
        
        for (let i=0; i<text.length; i++)
        {
            if (!text[i].redirect_to_blocks)
            {
                messages[i-redirect_count]={text: text[i]};
            }
           
            else
            {
                redirect_to_blocks = text[i].redirect_to_blocks;
                redirect_count++;
            }
        }
        
        if(redirect_to_blocks)
        {
            return (!messages[0]) ? {redirect_to_blocks} : { messages, redirect_to_blocks}; 
        }
        
        else
        {
            return { messages};
        }
    }
    
    else
    {
        return { messages: [ { text } ] };
    }
}

/**
 *  This function will find phrases with respective to the provided character within the given string. 
 *  Note : This function will only find the frst character of the string.
 *  @param msg The string to be searched.
 *  @param character The character to be searched within the string.
 *  @param before The boolean parameter. 
 *         If it's true, this function will return the phrases before the provided character.
 *         If not, the function will reutn the phrases behind it.
 *  @return The phrases before or after the provided character from the string.
 */

let FindPhrase = (msg, character, before) => {
  let CharacterFound=false;
  let CharacterPosition=0;
  for(CharacterPosition; !CharacterFound && CharacterPosition<msg.length; CharacterPosition++) {
    if(msg.charAt(CharacterPosition)==character)
    {
      CharacterFound=true;
    }
    
  }
  if(before)
  {
    return msg.slice(0, CharacterPosition);
  }
  else
  {
    return msg.slice(CharacterPosition);
  }
}

let handleResponse=(msg, res) => {
  let message = createTextMsg(msg);
  res.send(message);
}

let cfbroadcast=(options, res) => {
  let msg;
  return chatfuelbroadcast(options)
    .then(() => 
    {
      msg="Successfully sent the confirmation message";
      handleResponse(msg, res);
    },(error) =>
    {
      if(error.name==="StatusCodeError")
      {
        
        const HtmlErrorCode = FindPhrase(error.message, " ", true);
        console.log(HtmlErrorCode);
        if(HtmlErrorCode==422 || HtmlErrorCode==401) 
        {
          msg=error.message.slice(6);
          let errobj=JSON.parse(msg);
          msg=FindPhrase(errobj.result, ":", false).slice(1);
        }
        else 
        {
          msg=error.message;
        }
      }
      else
      {
        msg=error.message;
      }
      handleResponse(msg, res);
    });
}

app.post("/confirmpayment",(request,response) => {
  let query = url.parse(request.url, true).query;
  query=Object.assign({}, query, request.body);
  let userId = query['messenger id'];
  let coordinator = (query['coordinator']==="Yes") ? true : false;
  let confirmation = (query['confirmation']==="Yes") ? true : false;
  let blockId = (confirmation) ? "Authenticated" : "Wrong Code";
  let botId = process.env.botId;
  let token = process.env.token;
  let options = {botId, token, userId, blockId};
  let msg;
  
  if (!coordinator)
  {
    msg={redirect_to_blocks : ["Not Coordinator"]};
    response.send(msg);
  }
  else
  {
    msg= cfbroadcast(options, response);
  }
})

app.get("*",(request,response) => {
  response.render('not_found');
})

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${listener.address().port}`)
})
