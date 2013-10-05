# connect-blog #

## Synopsis ##

To set up a blog from within Express, try this:

```
var blog = require('connect-blog');

var blog = connectBlog({
    title       : 'CSS Minifier Blog',
    description : 'The CSS Minifier Blog, for All Your Minifying Needs!',
    contentDir  : fs.joinPath('/', __dirname, 'blog'),
    domain      : 'cssminifier.com',
    base        : '/blog',
});

app.get( '/blog/',      blog );
app.get( '/blog/:path', blog );

```

This will serve the following pages:

```
/blog/                       - renders the 'blog-index' template
/blog/rss20.xml              - creates a RSS 2.0 XML file
/blog/atom.xml               - creates an Atom XML file
/blog/archive                - renders 'blog-archive' template
/blog/archive:<year>         - renders 'blog-archive' template
/blog/archive:<year>-<month> - renders 'blog-archive' template
/blog/tag                    - renders 'blog-tagcloud' template
/blog/tag:<tag-name>         - renders 'blog-tag' template
/blog/<post-name>            - renders 'blog-post' template
```

Each template gets access to the following variables:

* title - the 'title' you passed in when setting the blog up
* posts - a chronological array of all posts
* latest - a reversed list of the latest 10 posts (defined by opts.latestCount)
* tagged - an object of each tag, each containing an array of posts
* archive - an object of year numbers, each an object of month numbers, each an array of posts

e.g.

```
title  = opts.title;
posts  = [ { ... }, { ... }, ... ];
latest = [ { ... }, { ... }, ... ];
tagged = {
    tag1 : { ... },
    tag2 : { ... },
    tag3 : { ... },
};
archive = {
    '2013' : {
        '01' : [ ...posts ... ],
        '02' : [ ...posts ... ],
        '03' : [ ...posts ... ],
    },
    '2012' : {
        '08' : [ ...posts ... ],
        '09' : [ ...posts ... ],
        '10' : [ ...posts ... ],
    },
};
```

## Routes ##

When a route is rendered it is called as follows so that it is independent of whatever template language you have already set up.

```
res.render('blog-post');
```

The ```/rss20.xml``` and ```/atom.xml``` do not call a template since the XML is generated within the middleware. They
only look at the ```opts``` originally passed in to create the middleware and the ```latest``` variable.

### Blog Index ###

```
Page     : /
Template : 'blog-index'
Locals   : (none)
```

### Archive Index ###

```
Page     : /archive
Template : 'blog-archive'
Locals   : title -> opts.title + ' Archive'
         : thisArchive -> archive
```

### Year Archive ###

```
Page     : /archive:<year>
Template : 'blog-archive'
Locals   : title -> opts.title + ' Archive'
         : thisArchive -> archive[year]
```

### Month Archive ###

```
Page     : /archive:<year>-<month>
Template : 'blog-archive'
Locals   : title -> opts.title + ' Archive'
         : thisArchive -> archive[year][month]
```

### Tag Index ###

```
Page     : /tag
Template : 'blog-tagcloud'
Locals   : title -> opts.title + ' TagCloud'
```

### Specific Tag ###

```
Page     : /tag:<name>
Template : 'blog-tag'
Locals   : title -> opts.title + ' : ' + tag
         : thesePosts -> tagged[tag]
         : thisTagName -> tag
```

### Post ###

```
Page     : /<post-name>
Template : 'blog-post'
Locals   : title -> post.meta.title
         : thisPost -> post[postName]
```

# Author #

Written by [Andrew Chilton](http://chilts.org/) - [Blog](http://chilts.org/blog/) - [Twitter](https://twitter.com/andychilton).

# License #

* [Copyright 2013 Andrew Chilton.  All rights reserved.](http://chilts.mit-license.org/2013/)

(Ends)
