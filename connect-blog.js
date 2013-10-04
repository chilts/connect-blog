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

// ----------------------------------------------------------------------------

var defaults = {
    latestCount : 10,
};

var months = {
    '01' : 'January',
    '02' : 'February',
    '03' : 'March',
    '04' : 'April',
    '05' : 'May',
    '06' : 'June',
    '07' : 'July',
    '08' : 'August',
    '09' : 'September',
    '10' : 'October',
    '11' : 'November',
    '12' : 'December',
};

// ----------------------------------------------------------------------------

module.exports = function(args) {
    console.log('args:', args);
    var opts = xtend({}, defaults, args);
    console.log('opts:', opts);

    if ( !opts.contentDir ) {
        throw new Error("Provide a contentDir");
    }

    var post  = {};
    var posts = [];

    // read all the files from the content dir
    var files = fs.readdirSync(opts.contentDir);
    files.forEach(function(filename) {
        var parts = filename.split(/\./);
        var basename = parts[0];
        var ext = parts[1];

        post[basename] = post[basename] || {
            name : basename,
        };

        var contents = fs.readFileSync(opts.contentDir + '/' + filename, 'utf8');

        if ( ext === 'json' ) {
            post[basename].meta = JSON.parse(contents);

            // generate some fields
            var dt = post[basename].meta.datetime;
            console.log('Yar=' + dt);
            post[basename].meta.year  = dt.substr(0, 4);
            post[basename].meta.month = dt.substr(5, 2);
            post[basename].meta.day   = dt.substr(8, 2);

            post[basename].meta.monthname = months[post[basename].meta.month];
            post[basename].meta.moment = moment(dt);
            post[basename].meta.datetime = new Date(dt);

            console.log(post[basename].meta);
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
        return a.meta.datetime > b.meta.datetime;
    });

    // set up some vars, like latest, archive (etc)
    latest = posts.reverse().slice(0, opts.latestCount);

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

    console.log('archive:', archive['2013']['10']);

    return function(req, res, next) {
        if ( false ) {
            console.log('--- connect-blog ---');
            console.log('path=' + req.path);
            console.log('url=' + req.url);
            console.log('params:', req.params);
            console.log('query:', req.query);
            console.log('body:', req.body);
        }

        var path = req.params.path;
        if ( !path ) {
            return res.render('blog-index', { title : opts.title, posts : posts, latest : latest });
        }

        // look for a page that looks like a blog
        if ( path === 'rss20.xml' ) {
            return res.send('RSS Feed');
        }

        if ( path === 'atom.xml' ) {
            return res.send('Atom Feed');
        }

        if ( path === 'archive' ) {
            return res.render('blog-archive', {
                title   : opts.title + ' Archive',
                posts   : posts,
                latest  : latest,
                archive : archive,
            });
        }

        // do we even need this 'archive' stuff anymore ... seriously?
        if ( path.indexOf('archive:') === 0 ) {
            var thisArchive = {};
            var parts = path.split(/:/)[1].split(/\-/);
            var thisYear = parts[0];
            var thisMonth = parts[1];
            console.log(thisYear, thisMonth);
            console.log(parts.length);
            console.log(archive[thisYear]);
            console.log(parts.length === 1 && thisArchive[thisYear]);
            if ( parts.length === 1 && archive[thisYear] ) {
                console.log('a');
                thisArchive[thisYear] = archive[thisYear];
                res.locals.title = 'Archive for ' + thisYear;
            }
            else if ( parts.length === 2 && archive[thisYear] && archive[thisYear][thisMonth] ) {
                console.log('b');
                thisArchive[thisYear] = {};
                thisArchive[thisYear][thisMonth] = archive[thisYear][thisMonth];
                res.locals.title = 'Archive for ' + months[thisMonth] + ' ' + thisYear;
            }
            else {
                console.log('c');
                // don't know this format
                return next();
            }

            return res.render('blog-archive', {
                archive : thisArchive,
            });
        }

        if ( path.indexOf('tag:') === 0 ) {
            return res.send('A Tag');
        }

        // is this a post
        if ( post[path] ) {
            return res.render('blog-post', {
                post  : post[path],
                posts : posts,
            });
        }

        // didn't find anything interesting, pass it on
        next();
    };
};

// ----------------------------------------------------------------------------
