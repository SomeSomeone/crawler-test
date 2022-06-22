const Crawler = require('crawler');
const fs = require('fs');

const START_URL = process.argv[2] || "https://www.google.com/"
const DEPTH_LIMIT = process.argv[3] || 0

let imageUrls = []
let sourceUrl = []

function addSourceUrl(url,depth){
  if(!sourceUrl.find(i=>i.url===url)){
    sourceUrl.push({
      url,
      depth,
      done:false,
      pending: false
    })
  }
}

function getNextSourceUrl(){
  return sourceUrl.find(i=>!i.pending && !i.done && i.depth<=DEPTH_LIMIT)
}

function getLinksFromPage(res){
  const $ = res.$;
  let links = $('a[href]');
  links = links.map(function() {
    return prepareLink($(this).attr( "href" ),res)
  });
  return links
}

function getImageUrlFromPage(res){
  const $ = res.$;
  let images = $('img[src]');
  images = images.map(function() {
    return prepareLink($(this).attr( "src" ),res)
  });
  return images
}

function addImageUrl(imageUrl,sourceUrl,depth){
  if(!imageUrls.find(i=>i.imageUrl===imageUrl)){
    imageUrls.push({
      imageUrl,
      sourceUrl,
      depth
    })
  }
}

function prepareLink(link,res){

  if(!link.startsWith("http")){
    let originUrl = res.request.uri.protocol+"//"+res.request.uri.host

    if(!link.startsWith("/") ){
      link ="/"+ link
    }
    link = originUrl + link
  }
  link = link.split('#')[0]
  return link
}

function saveImageUrls(){
  fs.writeFileSync('results.json', JSON.stringify(imageUrls,null,4));
}


const crawlerInstance = new Crawler({
  maxConnections: 10,

  callback: (error, res, done) => {
    if (error) {
      console.log(error);
    } else {
      console.log(res.options.depth + " | " + res.options.uri)
      getLinksFromPage(res).each((i,url)=>{
        addSourceUrl(url,res.options.depth+1)
      })
      getImageUrlFromPage(res).each((i,url)=>{
        addImageUrl(url,res.options.uri,res.options.depth)
      })

      let isHaveNewCall = callNextCrawler()
      if(!isHaveNewCall){
        saveImageUrls()
        console.log("____end_____")
      }

    }
    done();
  }
});

function callCrawler(sourceObj){
  sourceObj.done = false
  sourceObj.pending = true

  crawlerInstance.queue(
    {
      uri: sourceObj.url,
      depth: sourceObj.depth,
      sourceObj
    });
}

function callNextCrawler() {
  let nextUrl = getNextSourceUrl()
  if (nextUrl) {
    callCrawler(nextUrl)
    return true
  }
  else {
    return false
  }
}
console.log("____start_____")
addSourceUrl(START_URL,0)

callNextCrawler();
