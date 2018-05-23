export function matchRequest(expectedUrl, expectedBody){
  return function(url, options){
    console.log('got');
    console.log(options.body);
    console.log('expected');
    console.log(JSON.stringify(expectedBody));
    return url === expectedUrl && JSON.stringify(expectedBody) == options.body;
  };
}
