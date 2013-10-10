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
    latestCount : 10,
    basePath    : '',
};

// ----------------------------------------------------------------------------

module.exports = function(args) {
    var opts = xtend({}, defaults, args);

    if ( !opts.domain ) {
        throw new Error("Provide a domain");
    }

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

    // set up an easy way to access the latest posts
    latest = posts.reverse().slice(0, opts.latestCount);

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

    var middleware = function(req, res, next) {
        // for every page (and a side-effect for the feeds), give them each access to these things
        res.locals.title   = opts.title;
        res.locals.posts   = posts;
        res.locals.latest  = latest;
        res.locals.archive = archive;
        res.locals.tagged  = tagged;

        var path = req.params.path;
        if ( !path ) {
            return res.render('blog-index');
        }

        // look for a page that looks like a blog
        if ( path === 'rss20.xml' ) {
            // firstly, make the RSS feed
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
                title       : opts.title + ' : Archive',
                thisArchive : archive,
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
            }
            else if ( parts.length === 2 && archive[thisYear] && archive[thisYear][thisMonth] ) {
                thisArchive[thisYear] = {};
                thisArchive[thisYear][thisMonth] = archive[thisYear][thisMonth];
            }
            else {
                // don't know this format
                return next();
            }

            return res.render('blog-archive', {
                title       : opts.title + ' : Archive : ' + thisYear + (thisMonth ? '-' + thisMonth : ''),
                thisArchive : thisArchive,
            });
        }

        if ( path === 'tag' ) {
            return res.render('blog-tagcloud', {
                title : opts.title + ' : TagCloud',
            });
        }

        if ( path.indexOf('tag:') === 0 ) {
            var parts = path.split(/:/);
            var tagName = parts[1];
            if ( !tagged[tagName] ) {
                // 404 - Not Found
                return next();
            }

            return res.render('blog-tag', {
                title       : opts.title + ' : Tag : ' + tagName,
                thesePosts  : tagged[tagName],
                thisTagName : tagName,
            });
        }

        // is this a post
        if ( post[path] ) {
            return res.render('blog-post', {
                title    : opts.title + ' : ' + post[path].meta.title,
                thisPost : post[path],
            });
        }

        // didn't find anything interesting, pass it on
        next();
    };

    // prior to returning, let's put these vars onto this middleware so
    // the user can get access to some interesting things
    middleware.posts   = posts;
    middleware.latest  = latest;
    middleware.archive = archive;
    middleware.tagged  = tagged;

    return middleware;
};

// ----------------------------------------------------------------------------
