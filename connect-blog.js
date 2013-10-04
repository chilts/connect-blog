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
    var opts = xtend({}, defaults, args);

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
            post[basename].meta.year  = dt.substr(0, 4);
            post[basename].meta.month = dt.substr(5, 2);
            post[basename].meta.day   = dt.substr(8, 2);

            post[basename].meta.monthname = months[post[basename].meta.month];
            post[basename].meta.moment = moment(dt);
            post[basename].meta.datetime = new Date(dt);
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

    // keep a list of all the tagCollection
    var tagCollection = {};
    posts.forEach(function(post) {
        post.meta.tags.forEach(function(tag) {
            tagCollection[tag] = tagCollection[tag] || [];
            tagCollection[tag].push(post);
        });
    });

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
            return res.render('blog-index', {
                title   : opts.title,
                posts   : posts,
                latest  : latest,
                archive : archive,
            });
        }

        // look for a page that looks like a blog
        if ( path === 'rss20.xml' ) {
            // firstly, make the RSS feed
            var rss = {
                '@' : { version : '2.0' },
                channel : {
                    title         : opts.title,
                    description   : opts.description,
                    link          : 'http://' + opts.domain + opts.base + '/rss.xml',
                    lastBuildDate : moment().format("ddd, DD MMM YYYY HH:MM:SS Z"),
                    pubDate       : moment().format("ddd, DD MMM YYYY HH:MM:SS Z"),
                    ttl           : 1800,
                    item          : [],
                }
            };

            rss.item = posts.map(function(post, i) {
                return {
                    title       : post.meta.title,
                    description : post.html,
                    link        : 'http://' + opts.domain + opts.base + '/' + post.name,
                    guid        : 'http://' + opts.domain + opts.base + '/' + post.name,
                    pubDate     : post.meta.moment.format("ddd, DD MMM YYYY HH:MM:SS Z"),
                };
            });

            res.set('Content-Type', 'application/xml');
            return res.send(data2xml('rss', rss));
        }

        if ( path === 'atom.xml' ) {

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

            res.set('Content-Type', 'application/xml');
            return res.send(data2xml('feed', atom));
        }

        if ( path === 'archive' ) {
            return res.render('blog-archive', {
                title       : opts.title + ' Archive',
                posts       : posts,
                latest      : latest,
                thisArchive : archive,
                archive     : archive,
            });
        }

        // do we even need this 'archive' stuff anymore ... seriously?
        if ( path.indexOf('archive:') === 0 ) {
            var thisArchive = {};
            var parts = path.split(/:/)[1].split(/\-/);
            var thisYear = parts[0];
            var thisMonth = parts[1];
            if ( parts.length === 1 && archive[thisYear] ) {
                thisArchive[thisYear] = archive[thisYear];
                res.locals.title = 'Archive for ' + thisYear;
            }
            else if ( parts.length === 2 && archive[thisYear] && archive[thisYear][thisMonth] ) {
                thisArchive[thisYear] = {};
                thisArchive[thisYear][thisMonth] = archive[thisYear][thisMonth];
                res.locals.title = 'Archive for ' + months[thisMonth] + ' ' + thisYear;
            }
            else {
                // don't know this format
                return next();
            }

            return res.render('blog-archive', {
                title       : opts.title + ' Archive',
                posts       : posts,
                latest      : latest,
                archive     : archive,
                thisArchive : thisArchive,
            });
        }

        if ( path.indexOf('tag:') === 0 ) {
            var parts = path.split(/:/);
            var tagName = parts[1];
            console.log('tagName=' + tagName);
            if ( !tagCollection[tagName] ) {
                // 404 - Not Found
                return next();
            }

            return res.render('blog-tag', {
                title : opts.title + ' : ' + tagName,
                posts : tagCollection[tagName],
                tag   : tagName,
                archive     : archive,
            });
        }

        // is this a post
        if ( post[path] ) {
            return res.render('blog-post', {
                post    : post[path],
                posts   : posts,
                archive : archive,
            });
        }

        // didn't find anything interesting, pass it on
        next();
    };
};

// ----------------------------------------------------------------------------
