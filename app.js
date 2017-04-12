var http = require('http');
var fs = require('fs');
var cheerio = require('cheerio');
var request = require('request');
var async = require('async');
var iconv = require('iconv-lite');

var i = 0;
var imagesFolder = "Z:/Downloads";
var host = "http://zhainanshe.info";
var url = "http://zhainanshe.info/tuinvlang/1513.html";
//初始url 

function fetchPage(x) {     //封装了一层函数
    console.log("spider start")
    startRequest(x);
}


function startRequest(x) {
    var url = x;
    fetchContent(x, function (err, html) {
        if (err) {
            console.log("spider error");
            console.log(err);
            return;
        }

        var $ = cheerio.load(html); //采用cheerio模块解析html

        var time = $('.article-info a:first-child').next().text().trim();

        var news_item = {
            //获取文章的标题
            title: $('div.article-title a').text().trim(),
            //获取文章发布的时间
            Time: time,
            //获取当前文章的url
            link: host + $("div.article-title a").attr('href'),
            //获取供稿单位
            author: $('[title=供稿]').text().trim(),
            //i是用来判断获取了多少篇文章
            i: i = i + 1,

        };

        //console.log(news_item);     //打印新闻信息
        var reg = new RegExp("\/provider\/(.*)");
        var news_title = $('h1.article-title').text().trim();
        var tempMatch = news_title.match(/(.*?)(\(\d+\))/);
        if (tempMatch) {
            news_title = tempMatch[1];
        }


        //savedContent($, news_title);  //存储每篇文章的内容及文章标题

        savedImg($, news_title);    //存储每篇文章的图片及图片标题


        //下一篇文章的url
        if ($("li.next-page a").attr('href')) {
            var thisLink = url;
            var tempSplit = thisLink.split('/');
            tempSplit[tempSplit.length - 1] = $("li.next-page a").attr('href');
            var nextLink = tempSplit.join('/');
            str1 = nextLink.split('-');  //去除掉url后面的中文
            str = encodeURI(str1[0]);
            //这是亮点之一，通过控制I,可以控制爬取多少篇文章.
            if (i <= 500) {
                return startRequest(str);
            }
            else {
                console.log("spider stop")
            }
        }
        else {
            console.log("spider stop")
        }
    });
}

/**
 * [@param](/user/param) url 需要抓取的url地址
 * [@param](/user/param) calback
 */
function fetchContent(url, callback) {
    var response = function (err, response, body) {
        if (err) return callback(err);
        //返回的body 直接就是buffer 了...
        var html = iconv.decode(body, 'gb2312');
        callback(null, html);
    }
    request.get({
        url: url,
        encoding: null //让body 直接是buffer
    }, response);
}

//该函数的作用：在本地存储所爬取的新闻内容资源
function savedContent($, news_title) {
    $('.article-content p').each(function (index, item) {
        var x = $(this).text();

        var y = x.substring(0, 2).trim();

        if (y == '') {
            x = x + '\n';
            //将新闻文本内容一段一段添加到/data文件夹下，并用新闻的标题来命名文件
            fs.appendFile('./data/' + news_title + '.txt', x, 'utf-8', function (err) {
                if (err) {
                    console.log(err);
                }
            });
        }
    })
}

//该函数的作用：在本地存储所爬取到的图片资源
function savedImg($, news_title) {
    var news_folder = imagesFolder + "/" + news_title;
    createdFolder($, news_title, function () {
        $('.article-content img').each(function (index, item) {
            var img_src = host + $(this).attr('src'); //获取图片的url
            var img_title = img_src.split('/')[img_src.split('/').length - 1];
            var img_filename = img_title;

            //采用request模块，向服务器发起一次请求，获取图片资源
            request.head(img_src, function (err, res, body) {
                if (err) {
                    console.log(err);
                }
            });
            request(img_src).pipe(fs.createWriteStream(news_folder + '/' + img_filename));     //通过流的方式，把图片写到本地/image目录下，并用新闻的标题和图片的标题作为图片的名称。
        })
    });
}

//为每个新闻的首页创建目录
function createdFolder($, news_title, callback) {
    var news_folder = imagesFolder + "/" + news_title;
    var news_index = $('li.active span').text().trim();
    var flag = news_index == "1";
    if (news_index == "14") {
        var asss = 1;
    }
    if (flag) {
        async.waterfall([
            function (inCallback) {
                fs.exists(news_folder, function (exists) {
                    inCallback(null, exists);
                });
            }
        ], function (err, result) {
            if (err) throw err;
            if (!result) {
                fs.mkdir(news_folder, function () {
                    callback();
                });
            }
            else {
                callback();
            }
        });
    }
    else {
        callback();
    }
    console.log(news_title + "-" + news_index);
}

fetchPage(url);      //主程序开始运行