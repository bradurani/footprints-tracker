[![CircleCI](https://circleci.com/gh/bradurani/footprints-tracker.svg?style=svg)](https://circleci.com/gh/bradurani/footprints-tracker)

# Footprints Tracker

Footprints Tracker is a browser analytics tracking library. It is used to track user
actions in the browser and send events to a server. It is backend agnostic and
can be configured to work for most tracking use cases. It provides a retry queue
for failed sends and a persistent context for identifying users and other state.

## Installation

Add the following snippet to your page in the `<head>` element.
```javascript
<script type='text/javascript'>
  !(function(w,d,s,o){var fp=w.Footprints=w.Footprints||{};fp.q=fp.q||[];if(fp.initialized||fp.invoked) return;fp.invoked=true;fp.pageTime=new Date();fp.options = o;var m=['user','pageView','track','debug','once','off','on','ready','reset','context'];var pf=function(k){return function(){var a=[].slice.call(arguments);a.unshift(k);fp.q.push(a);}};for(var i=0;i<m.length;i++){fp[m[i]]=pf(m[i]);}var e=d.createElement('script');e.async=1;e.src=s;var t=d.getElementsByTagName('script')[0];t.parentNode.insertBefore(e,t);}
  )(window, document, '<URL OF footprints.min.js ON YOUR SERVER OR CDN>', {
    endpointUrl: '<YOUR ANALYTICS REPORTING ENDPOINT URL>',
  });

  Footprints.pageView();
</script>
```

## CDN Link
Footprints is available via Unpkg at the following URL:
`https://unpkg.com/footprints-tracker@0.9.1/release/footprints.min.js`

Previous versions can be found here:
`https://unpkg.com/footprints-tracker@<VERSION>/release/footprints.min.js`

## Tracking Events

To track a user event, call
```javascript
Footprints.track('Photo Uploaded');
```
This will cause a POST with a body like the following to be sent to your
endpoint
```javascript
{
  "pageTime": "2018-05-24T20:30:54.425Z",
  "pageId": "01CE9XHRESP6ZZ3AH8HAD3HXE3",
  "eventId": "01CE9XHREYSMBPNE23M8JZKPYB",
  "eventType":"track",
  "eventTime": "2018-05-24T20:30:54.430Z",
  "eventName": "Photo Uploaded"
}
```
**pageTime**: The time the page loaded in the browser  
**pageId**: a [ulid](https://www.npmjs.com/package/ulid) representing the page.  
This will be the same for all events sent from the same page.  
**eventId**: a [ulid](https://www.npmjs.com/package/ulid) unique to this event  
**eventType**: The type of event being sent  
**eventName**: A name identifying the action the user has taken  
**title**: The title of the page  
**url**: the url of the page  

## User Identification

**For a known user**
```javascript
Footprints.user('123abc', { email: 'jane@doe.com' });
```
The first argument is the user's unique id from your system. The properties in the object 
passed as the 2nd argument will be added to every subsequent event (`pageView`, `track`, etc.)

**For an unknown user**
```javascript
Footprints.user({ visitedSignUpPage: true });
```
All properties will be passed to every subsequent event (`pageView`, `track`, etc. )

`Footprints.user` itself does not send any events to the server, so you should call it
before calling `Footprints.pageView()`.

## Setting Additional Context

You can set additional properties that will be sent on every event.

```javascript
Footprints.user('12', { name: 'Brad Urani' })
Footprints.context({ pageType: 'shopping', collection: 'Fall 2018' }),
Footprints.pageView();
```
will create a POST with the following body:
```javascript
{
  "collection": "Fall 2018",
  "eventId": "01CE9ZV5F5C8HYQ741YFJ5TNX0",
  "eventType": "pageView",
  "eventTime": "2018-05-24T21:10:59.813Z",
  "name": "Brad Urani",
  "pageId": "01CE9ZV5F47EDX0HHRG7NS4VQ9",
  "pageTime": "2018-05-24T21:10:59.812Z",
  "pageType": "shopping",
  "title": "Real News",
  "url": "http://localhost:8000/",
  "userId": "12"
}
```

## Snippet arguments

The snippet arguments are `window`, `documents`, `scriptUrl`, `options`

```javascript
<script type='text/javascript'>
  !(function(w,d,s,o){var fp=w.Footprints=w.Footprints||{};fp.q=fp.q||[];if(fp.initialized||fp.invoked) return;fp.invoked=true;fp.pageTime=new Date();fp.options = o;var m=['user','pageView','track','debug','once','off','on','ready','reset','context'];var pf=function(k){return function(){var a=[].slice.call(arguments);a.unshift(k);fp.q.push(a);}};for(var i=0;i<m.length;i++){fp[m[i]]=pf(m[i]);}var e=d.createElement('script');e.async=1;e.src=s;var t=d.getElementsByTagName('script')[0];t.parentNode.insertBefore(e,t);}
 )(window, document, scriptUrl, options);
 </script>
 ```

`window`: the current window  
`document`: the current document  
`scriptUrl`: the url of where the footprints script is located  
`options`:
  - `endpointURL`: the http or https endpoint where the analytic events will be
    POSTed to ***(required)***
  - `debug`: Enables debug output in the console if set to `true`
  - `intervalWait`: the interval at which the script retries failed events
    (default: 5000)
  - `pageId`: overrides the automatically generated pageId ulid
  - `pageTime`: override the automatically generated pageTime
  - `successCallback`: used to provide a function that is called every time an
    event is successfully sent
  - `errorCallback`: used to provide a function that is called every time an
    event send fails
  - `readyCallback`: used to provide a function that is called when the
    footprints script is finished loading
  - `transformPayloadFunc`: used to transform the POST body JSON that is created
    by Footprints by default into a POST body that is compatible with your
    endpoint (see below)
  - `uniqueIdFunc`: used to provide a function that creates a uniqueId, if you
    want to use something other than ulids

## Transforming the event payload

If the POST body JSON generated by Footprints by default is not compatible with
your endpoint, you can transform it before it is sent by using the
`transformPayloadFunc` option. It is a function that takes the default payload and
returns the desired payload and can be used to rename, convert, add or remove
payload fields. So, for example, if you wanted to convert the
`eventTime` field to UNIX epoch time, you could do:

```javascript
<script type='text/javascript'>
  !(function(w,d,s,o){var fp=w.Footprints=w.Footprints||{};fp.q=fp.q||[];if(fp.initialized||fp.invoked) return;fp.invoked=true;fp.pageTime=new Date();fp.options = o;var m=['user','pageView','track','debug','once','off','on','ready','reset','context'];var pf=function(k){return function(){var a=[].slice.call(arguments);a.unshift(k);fp.q.push(a);}};for(var i=0;i<m.length;i++){fp[m[i]]=pf(m[i]);}var e=d.createElement('script');e.async=1;e.src=s;var t=d.getElementsByTagName('script')[0];t.parentNode.insertBefore(e,t);}
  )(window, document, '<URL OF footprints.min.js ON YOUR SERVER OR CDN>', {
    endpointUrl: '<YOUR ANALYTICS REPORTING ENDPOINT URL>',
    transformPayloadFunc: function(defaultPayload) {
      defaultPayload['eventTime'] = Date.parse(defaultPayload['eventTime']);
      return defaultPayload;
    }
  });

```

## Compatibility

Footprints is written in JavaScript 5 for compatibility and to keep file sizes
minimal. The only modern feature it uses is the `fetch` API. If you need to
target browsers that don't support `fetch`, you should use a polyfill.

## Development

Install [npm](https://www.npmjs.com/get-npm) and run
```bash
npm install
```

Start the webpack dev server
```bash
npm start
```
and navigate to `localhost:8000`

## Future Improvements
- Storing an anonymous user id in local storage for unknown users
- Make event queue and persist between pages with local storage or background
  workers
- Debounce and throttle methods
- Callbacks for all event types
- Link tracking capabilities
- Form tracking capabilites
- Ability to disable the retry timer
- Event batching
- Snippet version
