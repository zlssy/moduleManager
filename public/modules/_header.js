define('_header', ['jquery', 'util'], function ($, util) {
    $('.head-search > .search').on('click', function () {
        var keys = $('.head-search > .keys').val();
        if(keys){
            location.href = '/search/'+keys;
        }
    });
    $('.head-search .keys').on('keydown', function (e) {
        var keys;

        if( (e.keyCode === 13 || e.which === 13) && (keys = $('.head-search > .keys').val())){
            location.href = '/search/'+keys;
        }
    });
});