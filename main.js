//import
const { json } = require('express')
const express = require('express')
const handlebars = require('express-handlebars')
const fetch = require('node-fetch')
const withQuery = require('with-query').default

//configure the port
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000
const API_KEY = process.env.API_KEY || ''

//create an instance of Express app
const app = express()

//create and set the view engine to handlebars
app.engine('hbs', handlebars({ defaultLayout: 'default.hbs' }))
app.set('view engine', 'hbs')

//Constant variables
const flags = {
    'cn': 'cn.png',
    'fr': 'fr.png',
    'jp': 'jp.png',
    'sg': 'sg.png',
    'uk': 'uk.png',
    'us': 'us.png'
}

const category = [
    'business',
    'entertainment',
    'general',
    'health',
    'science',
    'sports',
    'technology'
]

//Variables for caching
const apiCallArray = []
const ttlArray = []
const apiCallResult = []

//API Endpoint and function for construction of API URL
const ENDPOINT = 'https://newsapi.org/v2/top-headlines'

const createURL = (q, country, category) => {
    return withQuery(ENDPOINT, {
        q,
        country,
        category
    })
}

//Call API
const apiCall = async (url, res) => {
    try{
        console.info('GET ' + url)
        const result = await fetch(url,
            {headers: 
                {
                    'X-Api-Key': API_KEY
                }
            }
        )
        const jsonResult = await result.json()
    
        //Cache results and set time to live to 15 minutes
        let a = new Date()
        let b = new Date(a.getTime() + 15 * 60000)
    
        apiCallArray.push(url)
        ttlArray.push(b)
        apiCallResult.push(jsonResult.articles)
    
        renderResultsPage(jsonResult.articles, res)
    }
    catch(e) {
        console.info(e)
        res.status(503)
        res.type('text/html')
        res.render('index',
        {
            flags,
            category
        })
    }
}

//Render results page
const renderResultsPage = (articles, res) => {
    res.status(200)
    res.type('text/html')
    res.render('search', {
        articles
    })
}

//Middlewares/Routing
app.use(express.static(__dirname + '\\static\\images'))

app.get(['/', 'index.html'],
    (req, res) => {
        res.status(200)
        res.type('text/html')
        res.render('index.hbs',
        {
            flags,
            category
        })
    }
)

app.get('/search',
    (req, res) => {
        const url = createURL(req.query.searchTerm.toLowerCase(), req.query.country, req.query.category)
        const index = apiCallArray.indexOf(url)
        if(index > -1) {
            if(new Date() > ttlArray[index]) {
                apiCallArray.splice(index, 1)
                ttlArray.splice(index, 1)
                apiCallResult.splice(index, 1)
                apiCall(url, res)
            }
            else {
                console.info('GET from cache')
                renderResultsPage(apiCallResult[index], res)
            }
        }
        else{
            apiCall(url, res)
        }
    }
)

app.use((req, res) => {
    res.status(302)
    res.type('text/html')
    res.render('index.hbs',
    {
        flags,
        category
    })
})

//start the app
if(API_KEY) {
    app.listen(PORT, () => {
        console.info(`App has started on ${PORT} at ${new Date()}`)
    })
}