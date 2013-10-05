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

# Author #

Written by [Andrew Chilton](http://chilts.org/) - [Blog](http://chilts.org/blog/) - [Twitter](https://twitter.com/andychilton).

# License #

* [Copyright 2013 Andrew Chilton.  All rights reserved.](http://chilts.mit-license.org/2013/)

(Ends)
