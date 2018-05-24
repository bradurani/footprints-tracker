[![CircleCI](https://circleci.com/gh/bradurani/footprints.svg?style=svg)](https://circleci.com/gh/bradurani/footprints)

# Footprints

Footprints is a browser analytics tracking library. It is used to track user
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
  "eventName":"track",
  "eventTime": "2018-05-24T20:30:54.430Z",
  "key": "Photo Uploaded"
}
```
**pageTime**: The time the page loaded in the browser  
**pageId**: a [ulid](https://www.npmjs.com/package/ulid) representing the page.  
This will be the same for all events sent from the same page.  
**eventId**: a [ulid](https://www.npmjs.com/package/ulid) unique to this event  
**eventName**: The type of event being sent  
**key**: A name identifying the action the user has taken  
**title**: The title of the page  
**url**: the url of the page  

**User Identification**

***For a known user***
```
Footprints.user('123abc', { email: 'jane@doe.com' });
```
The first argument is the user's unique id from your system. The properties in the object 
passed as the 2nd argument will be added to every subsequent event (`pageView`, `track`, etc.)

**For an unknown user**
```
Footprints.user({ visitedSignUpPage: true });
```
All properties will be passed to every subsequent event (`pageView`, `track`, etc. )

`Footprints.user` itself does not send any events to the server, so you should call it
before calling `Footprints.pageView()`.

**Setting Additional Context**

You can set additional properties that will be sent on every event.

```
Footprints.user('12', { name: 'Brad Urani' })
Footprints.context({ pageType: 'shopping', collection: 'Fall 2018' }),
Footprints.pageView();
```
will create a POST with the following body:
```
{
  "collection": "Fall 2018",
  "eventId": "01CE9ZV5F5C8HYQ741YFJ5TNX0",
  "eventName": "pageView",
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
- Config for running test suite in a browser
- Ability to disable the retry timer
- beforeSend callback for transforming the POST body
- Event batching
