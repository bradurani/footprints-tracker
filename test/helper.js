export function matchRequest(expectedUrl, expectedBody){
  return function(url, options){
    var bodyMatched = JSON.stringify(expectedBody) == options.body;
    // if(!bodyMatched){
    //   console.log('got');
    //   console.log(options.body);
    //   console.log('expected');
    //   console.log(JSON.stringify(expectedBody));
    // }
    return url === expectedUrl && bodyMatched;
  };
}
