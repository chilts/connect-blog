# connect-blog #

## Synopsis ##

```
var connectBlog = require('connect-blog');

var blog = connectBlog({
    domain : 'example.com',
});

// later on
app.get('/', blog);
app.get('/:path', blog);
```

This example will serve this blog at the root level of the ```example.com``` domain. You must set both ```/``` and
```/:path``` so that we can determine in the middleware whether to show the index page or something else. The
```/:path``` parameter must also be called ```path```, not anything else.

## What is connect-blog ##

'connect-blog' is middleware for Express/Connect. It can read a directory full of static ```*.md``` and ```*.json``` files
and then serve up a blog for you. Each post should consist of two files.

Imagine a post called ```my-first-post```. Therefore, you require:

* my-first-post.md
* my-first-post.json

Once 'connect-blog' has read those files in, it will create a structure similar to the following:

```
{
    name    : 'my-first-post',
    content : ' ... the markdown from the *.md file ... ',
    html    : ' ... the HTML from the MarkDown conversion ... ',
    meta    : {
        // then entire data read from the *.json file
    }
}
```

By keeping to this structure, 'connect-blog' knows where to find everything. An example ```*.json``` file would be:

```
{
    "title" : "My First Post",
    "date"  : "2013-10-04T02:02:17.516Z",
    "tags"  : [ "css", "html5", "javascript", "app" ]
}
```

Please note that the published time of the post comes from the ```date``` field and it must be parseable by ```new
Date(date)```. The year and month of that date is also used in the archive. The date is used in all templates
(index, post, archive, tag) and the feeds (RSS, Atom). The ```tags``` are used for the tagging posts and in the
tagcloud template. (Of course, you need to write the templates yourself so this could change.)

You can add in any other data you like this ```*.json``` file that you may need in the templates related to each post.

A default post is set up once either of these files are read. The default post looks like:

```
var now = new Date();
var nowMoment = moment(now);
{
    name : '...', // same as the filename, e.g. basename.json or basename.md
    meta : {
        title     : basename.split(/-/).map(function(str) { return str.substr(0, 1).toUpperCase() + str.substr(1); }).join(' '),
        date      : now,
        moment    : nowMoment,
        year      : nowMoment.format('YYYY'),
        month     : nowMoment.format('MM'),
        day       : nowMoment.format('DD'),
        monthname : nowMoment.format('MMMM'),
        tags    : [],
    },
    content : '',
    html    : '',
}
```

This default post is set so that if you just have ```basename.md``` and no ```basename.json```, then the blog will
still render and not throw errors. Same if you have ```basename.json``` but not ```basename.md``` (but that wouldn't be
much good either).

## Synopsis ##

To set up a blog from within Express, try this:

```
var blog = require('connect-blog');

var blog = connectBlog({
    title       : 'CSS Minifier Blog',
    description : 'The CSS Minifier Blog, for All Your Minifying Needs!',
    contentDir  : fs.joinPath('/', __dirname, 'blog'),
    domain      : 'cssminifier.com',
    basePath    : '/blog',
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
/blog/archive-<year>         - renders 'blog-archive' template
/blog/archive-<year>-<month> - renders 'blog-archive' template
/blog/tag                    - renders 'blog-tagcloud' template
/blog/tag-<tag-name>         - renders 'blog-tag' template
/blog/<post-name>            - renders 'blog-post' template
```

Each template gets access to the following variables:

* title - the 'title' you passed in when setting the blog up
* posts - a chronological array of all posts
* pages - all the posts split up into pages (using opts.indexCount)
* latest - a reversed list of the latest 10 posts (defined by opts.latestCount)
* tagged - an object of each tag, each containing an array of posts
* archive - an object of year numbers, each an object of month numbers, each an array of posts

e.g.

```
title  = opts.title;
posts  = [ ...posts... ];
latest = [ ...posts... ];
tagged = {
    tag1 : [ ...posts... ],
    tag2 : [ ...posts... ],
    tag3 : [ ...posts... ],
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

## Default Options ##

The default options have reasonable (not necessarily sensible) defaults for each of these keys, so the only onw you MUST provide
is the ```domain```.

```
var opts = {
    title       : 'Blog',
    description : '',
    contentDir  : 'blog',
    indexCount  : 10,
    latestCount : 20,
    basePath    : '',
};
```

So, to go with defaults you can just call:

```
var blogMiddleware = connectBlog({ domain : 'example.com' });
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
Page     : /archive-<year>
Template : 'blog-archive'
Locals   : title -> opts.title + ' Archive'
         : thisArchive -> archive[year]
```

### Month Archive ###

```
Page     : /archive-<year>-<month>
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
Page     : /tag-<name>
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
