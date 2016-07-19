var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/demo/*', function (req, res, next) {
  var url = req.url;
  var path = url.replace(/\/demo/, '');
  res.render('demo', {
    title: 'Demo',
    params: path
  });
});

router.get('/test', function (req, res, next) {
  res.render('test', {title: 'Test'});
});

router.get('/demo', function (req, res, next) {
  res.redirect('/demo/');
});

router.get(/\/module\/?([^\/]*)/, function (req, res, next) {
  var action = req.params[0] || '',
      title = {add: '添加模块', edit: '编辑模块'};

  if(req.url.indexOf('.js') > -1){
    next();
  }
  else {
    if (['add', 'edit'].indexOf(action) > -1) {
      res.render('moduleadd', {
        title: title[action],
        action: action
      });
    }
    else {
      res.render('module', {
        title: '模块管理',
        action: action
      });
    }
  }
});

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Legos 1.0' });
});

module.exports = router;
