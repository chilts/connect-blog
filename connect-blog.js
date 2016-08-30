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
var xtend = require('xtend');
var blogz = require('blogz');

// ----------------------------------------------------------------------------

var defaults = { 
    title                : 'Blog',
    description          : '',
    contentDir           : 'blog',
    indexCount           : 10,
    latestCount          : 20,
    basePath             : '',
    indexTemplate        : 'blog-index',
    postTemplate         : 'blog-post',
    tagAllTemplate       : 'blog-tag-all',
    tagOneTemplate       : 'blog-tag-one',
    catAllTemplate       : 'blog-category-all',
    catOneTemplate       : 'blog-category-one',
    archiveAllTemplate   : 'blog-archive-all',
    archiveYearTemplate  : 'blog-archive-year',
    archiveMonthTemplate : 'blog-archive-month',
};

// ----------------------------------------------------------------------------

module.exports = function(args) {
    var opts = xtend({}, defaults, args);

    if ( !opts.domain ) {
        throw new Error("Provide a domain");
    }

    // read in all the blog data (sync - since it's at server startup) (ToDo: change to async)
    var data = blogz.readSync(opts);

    var middleware = function(req, res, next) {
        // for every page (and a side-effect for the feeds), give them each access to these things
        res.locals.blog = {
            title    : opts.title,
            posts    : data.posts,
            pages    : data.pages,
            latest   : data.latest,
            archive  : data.archive,
            tag      : data.tag,
            category : data.category,
            domain   : opts.domain,
            base     : opts.base,

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
            return res.render(opts.indexTemplate);
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
                return res.render(opts.indexTemplate);
            }

            // unknown page
            return next();
        }

        if ( path === 'archive' ) {
            res.locals.blog.title = opts.title + ' : Archive';
            return res.render(opts.archiveAllTemplate);
        }

        if ( path.indexOf('archive-') === 0 ) {
            var thisArchive = {};
            var parts = path.split(/-/);
            var thisYear = parts[1];
            var thisMonth = parts[2];
            var template;

            // archive-yyyy
            if ( parts.length === 2 && data.archive[thisYear] ) {
                res.locals.blog.title           = opts.title + ' : Archive : ' + thisYear;
                res.locals.blog.yearNum         = thisYear;
                res.locals.blog.thisArchiveYear = data.archive[thisYear];
                return res.render(opts.archiveYearTemplate);
            }

            // archive-yyyy-mm
            if ( parts.length === 3 && data.archive[thisYear] && data.archive[thisYear][thisMonth] ) {
                res.locals.blog.title            = opts.title + ' : Archive : ' + thisYear + '-' + thisMonth;
                res.locals.blog.yearNum          = thisYear;
                res.locals.blog.monthName        = data.archive[thisYear][thisMonth][0].meta.moment.format('MMM');
                res.locals.blog.thisArchiveMonth = data.archive[thisYear][thisMonth];
                return res.render(opts.archiveMonthTemplate);
            }

            // don't know this format
            return next();
        }

        if ( path === 'tag' ) {
            res.locals.blog.title = opts.title + ' : TagCloud';
            return res.render(opts.tagAllTemplate);
        }

        if ( path.indexOf('tag-') === 0 ) {
            var parts = path.split(/-/);
            var tagName = parts.slice(1).join('-');
            if ( !data.tag[tagName] ) {
                // 404 - Not Found
                return next();
            }

            res.locals.blog.title      = opts.title + ' : Tag : ' + tagName;
            res.locals.blog.tagName    = tagName;
            res.locals.blog.thesePosts = data.tag[tagName];
            return res.render(opts.tagOneTemplate);
        }

        if ( path === 'category' ) {
            res.locals.blog.title = opts.title + ' : CategoryCloud';
            return res.render(opts.catAllTemplate);
        }

        if ( path.indexOf('category-') === 0 ) {
            var parts = path.split(/-/);
            var catName = parts.slice(1).join('-');
            if ( !data.category[tagName] ) {
                // 404 - Not Found
                return next();
            }

            res.locals.blog.title      = opts.title + ' : Tag : ' + tagName;
            res.locals.blog.catName    = catName;
            res.locals.blog.thesePosts = data.category[catName];
            return res.render(opts.catOneTemplate);
        }

        // is this a post
        if ( data.post[path] ) {
            res.locals.blog.title    = opts.title + ' : ' + data.post[path].meta.title;
            res.locals.blog.thisPost = data.post[path];
            return res.render(opts.postTemplate);
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

    middleware.reloadData = function() {
        data = readBlogSync(opts);
        middleware.posts   = data.posts;
        middleware.latest  = data.latest;
        middleware.archive = data.archive;
        middleware.tagged  = data.tagged;
    };

    return middleware;
};

// ----------------------------------------------------------------------------
