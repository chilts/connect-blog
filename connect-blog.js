// ----------------------------------------------------------------------------
//
// connect-blog.js - Blog middleware you can add to your Connect/Express app.
//
// Copyright (c) 2013 Andrew Chilton. All rights resered.
//
// License: http://chilts.mit-license.org/2013/
//
// ----------------------------------------------------------------------------

// core
var fs = require('fs');

// npm
var moment = require('moment');
var marked = require('marked');
var xtend = require('xtend');
var data2xml = require('data2xml')({
    attrProp : '@',
    valProp  : '#',
});

// ----------------------------------------------------------------------------

var defaults = { 
    title       : 'Blog',
    description : '',
    contentDir  : 'blog',
    indexCount  : 10,
    latestCount : 20,
    basePath    : '',
};

function readBlogSync(opts) {


    var post  = {};
    var posts = [];

    var now = new Date();
    var nowMoment = moment(now);

    // read all the files from the content dir
    var files = fs.readdirSync(opts.contentDir);
    files.forEach(function(filename) {
        var parts = filename.split(/\./);
        var basename = parts[0];
        var ext = parts[1];

        // strip any initial numbers from the post name
        if ( basename.match(/^\d+-/) ) {
            basename = basename.replace(/^\d+-/, '');
        }

        // set this to a default post with the 'name'
        post[basename] = post[basename] || {
            name    : basename,
            meta    : {
                title     : basename.split(/-/).map(function(str) { return str.substr(0, 1).toUpperCase() + str.substr(1); }).join(' '),
                datetime  : now,
                moment    : nowMoment,
                year      : nowMoment.format('YYYY'),
                month     : nowMoment.format('MM'),
                day       : nowMoment.format('DD'),
                monthname : nowMoment.format('MMMM'),
                tags    : [],
            },
            content : '',
            html    : '',
        };

        var contents = fs.readFileSync(opts.contentDir + '/' + filename, 'utf8');

        if ( ext === 'json' ) {
            try {
                post[basename].meta = JSON.parse(contents);
            }
            catch (e) {
                console.warn('Error parsing ' + filename + ' file : ' + e);
                process.exit(2);
            }

            // save this datetime as a regular JavaScript Date()
            post[basename].meta.datetime = new Date(post[basename].meta.datetime);

            // now save it as a moment()
            var dtMoment = moment(post[basename].meta.datetime);
            post[basename].meta.year  = dtMoment.format('YYYY');
            post[basename].meta.month = dtMoment.format('MM');
            post[basename].meta.day   = dtMoment.format('DD');

            post[basename].meta.monthname = dtMoment.format('MMMM');
            post[basename].meta.moment = dtMoment;
        }
        if ( ext === 'md' ) {
            post[basename].content = contents;
            post[basename].html = marked(contents);
        }
        
    });

    // sort the posts by chronological order
    posts = Object.keys(post).map(function(name) {
        // get the post itself
        return post[name];
    }).sort(function(a, b) {
        // sort on datetime
        if ( a.meta.datetime.toISOString() < b.meta.datetime.toISOString() )
            return -1;
        if ( a.meta.datetime.toISOString() > b.meta.datetime.toISOString() )
            return 1;
        return 0;
    });

    // make sure each post has a prev and next
    posts.forEach(function(post, i) {
        if ( i > 0 ) {
            post.prev = posts[i-1];
        }
        if ( i < posts.length - 1 ) {
            post.next = posts[i+1];
        }
    });

    // get a copy of all the posts but reversed
    var reverse = posts.slice(0);
    reverse.reverse();

    // set up an easy way to access the latest posts
    latest = reverse.slice(0, opts.latestCount);

    // make the index pages
    var pages = [];
    for ( var i = 0; i < posts.length; i += opts.indexCount ) {
        pages.push(reverse.slice(i, i + opts.indexCount));
    }

    // make the archive
    var archive = {};
    posts.forEach(function(post) {
        var year = post.meta.year;
        var month = post.meta.month;

        // setup blank year and/or month lists
        archive[year] = archive[year] || {};
        archive[year][month] = archive[year][month] || [];

        // add this post to this month's archive
        archive[year][month].push(post);
    });

    // keep a list of all the tagged
    var tagged = {};
    posts.forEach(function(post) {
        post.meta.tags.forEach(function(tag) {
            tagged[tag] = tagged[tag] || [];
            tagged[tag].push(post);
        });
    });

    // make the rss20.xml feed - firstly, make the RSS feed
    var rss = {
        '@' : { version : '2.0' },
        channel : {
            title         : opts.title,
            description   : opts.description,
            link          : 'http://' + opts.domain + opts.base + '/rss20.xml',
            lastBuildDate : moment().format("ddd, DD MMM YYYY HH:mm:ss ZZ"),
            pubDate       : moment().format("ddd, DD MMM YYYY HH:mm:ss ZZ"),
            ttl           : 1800,
            item          : [],
        }
    };

    rss.channel.item = posts.map(function(post, i) {
        return {
            title       : post.meta.title,
            description : post.html,
            link        : 'http://' + opts.domain + opts.base + '/' + post.name,
            guid        : 'http://' + opts.domain + opts.base + '/' + post.name,
            pubDate     : post.meta.moment.format("ddd, DD MMM YYYY HH:mm:ss ZZ"),
        };
    });

    var rssxml = data2xml('rss', rss);

    // make the atom.xml feed
    var atom = {
        '@'     : { xmlns : 'http://www.w3.org/2005/Atom' },
        title   : opts.title,
        link    : {
            '@' : {
                href : 'http://' + opts.domain + opts.base + '/atom.xml',
                rel  : 'self',
            },
        },
        updated : moment().format(),
        id      : 'http://' + opts.domain + '/',
        author  : {
            name  : 'Andrew Chilton',
            email : 'andychilton@gmail.com',
        },
        entry   : [],
    };

    atom.entry = posts.map(function(post, i) {
        return {
            title   : post.meta.title,
            id      : 'http://' + opts.domain + opts.base + '/' + post.name,
            link    : [
                {
                    '@' : { href : 'http://' + opts.domain + opts.base + '/' + post.name }
                },
                {
                    '@' : {
                        href : 'http://' + opts.domain + opts.base + '/' + post.name,
                        rel : 'self'
                    }
                }
            ],
            content : {
                '@' : { type : 'html' },
                '#' : post.html,
            },
            updated : post.meta.moment.format(),
        };
    });

    var atomxml = data2xml('feed', atom);

    return {
        posts   : posts,
        post    : post,
        pages   : pages,
        latest  : latest,
        archive : archive,
        tagged  : tagged,
        rss     : rssxml,
        atom    : atomxml,
    };
}

// ----------------------------------------------------------------------------

module.exports = function(args) {
    var opts = xtend({}, defaults, args);

    if ( !opts.domain ) {
        throw new Error("Provide a domain");
    }

    // read in all the blog data (sync - since it's at server startup) (ToDo: change to async)
    var data = readBlogSync(opts);

    var middleware = function(req, res, next) {
        // for every page (and a side-effect for the feeds), give them each access to these things
        res.locals.blog = {
            title   : opts.title,
            posts   : data.posts,
            pages   : data.pages,
            latest  : data.latest,
            archive : data.archive,
            tagged  : data.tagged,

            // Others:
            // * thisPost
            // * thisArchive
            // * thisTagName
            // * thisTag
            // * thesePosts - for blog-index, ???
            // * thisPageNum - for blog-index
            // * prevUrl \_ for blog-post, blog-archive and blog-index
            // * nextUrl /
        };

        var path = req.params.path;

        if ( !path ) {
            res.locals.blog.thesePosts  = data.pages[0];
            res.locals.blog.thisPageNum = 1;
            res.locals.blog.prevUrl     = undefined;
            res.locals.blog.nextUrl     = data.pages.length > 1 ? './page:2' : undefined;
            return res.render('blog-index');
        }

        // look for a page that looks like a blog
        if ( path === 'rss20.xml' ) {
            res.set('Content-Type', 'application/xml');
            return res.send(data.rss);
        }

        if ( path === 'atom.xml' ) {
            res.set('Content-Type', 'application/xml');
            return res.send(data.atom);
        }

        if ( path.indexOf('page:') === 0 ) {
            // Note: the pages are 1..10, but our pages array is 0..9.
            var page = path.split(/:/)[1];

            // Note1: can return NaN, which will fail the following 'if'.
            // Note2: we use +page rather than parseInt(page, 10) since
            //        '1asd' won't give a 1 in the first case, but in the second it will.
            page = +page;

            if ( page > 0 && page <= data.pages.length ) {
                res.locals.blog.thesePosts  = data.pages[page-1];
                res.locals.blog.thisPageNum = page;
                res.locals.blog.prevUrl     = page > 1 ? './page:' + (page-1) : undefined;
                res.locals.blog.nextUrl     = page < data.pages.length ? './page:' + (page+1) : undefined;
                return res.render('blog-index');
            }

            // unknown page
            return next();
        }

        if ( path === 'archive' ) {
            res.locals.blog.title = opts.title + ' : Archive';
            return res.render('blog-archive-all');
        }

        if ( path.indexOf('archive:') === 0 ) {
            var thisArchive = {};
            var parts = path.split(/:/)[1].split(/\-/);
            var thisYear = parts[0];
            var thisMonth = parts[1];
            var template;

            // archive:yyyy
            if ( parts.length === 1 && data.archive[thisYear] ) {
                res.locals.blog.title           = opts.title + ' : Archive : ' + thisYear;
                res.locals.blog.yearNum         = thisYear;
                res.locals.blog.thisArchiveYear = data.archive[thisYear];
                return res.render('blog-archive-year');
            }

            // archive:yyyy-mm
            if ( parts.length === 2 && data.archive[thisYear] && data.archive[thisYear][thisMonth] ) {
                res.locals.blog.title            = opts.title + ' : Archive : ' + thisYear + '-' + thisMonth;
                res.locals.blog.yearNum          = thisYear;
                res.locals.blog.monthName        = data.archive[thisYear][thisMonth][0].meta.moment.format('MMM');
                res.locals.blog.thisArchiveMonth = data.archive[thisYear][thisMonth];
                return res.render('blog-archive-month');
            }

            // don't know this format
            return next();
        }

        if ( path === 'tag' ) {
            res.locals.blog.title = opts.title + ' : TagCloud';
            return res.render('blog-tag-all');
        }

        if ( path.indexOf('tag:') === 0 ) {
            var parts = path.split(/:/);
            var tagName = parts[1];
            if ( !data.tagged[tagName] ) {
                // 404 - Not Found
                return next();
            }

            res.locals.blog.title      = opts.title + ' : Tag : ' + tagName;
            res.locals.blog.tagName    = tagName;
            res.locals.blog.thesePosts = data.tagged[tagName];
            return res.render('blog-tag-one');
        }

        // is this a post
        if ( data.post[path] ) {
            res.locals.blog.title    = opts.title + ' : ' + data.post[path].meta.title;
            res.locals.blog.thisPost = data.post[path];
            return res.render('blog-post');
        }

        // didn't find anything interesting, pass it on
        next();
    };

    // prior to returning, let's put these vars onto this middleware so
    // the user can get access to some interesting things
    middleware.posts   = data.posts;
    middleware.latest  = data.latest;
    middleware.archive = data.archive;
    middleware.tagged  = data.tagged;

    return middleware;
};

// ----------------------------------------------------------------------------
