define('_header', ['jquery', 'util'], function ($, util) {
    $('.head-search > .search').on('click', function () {
        var keys = $('.head-search > .keys').val();
        if(keys){
            location.href = '/search/'+keys;
        }
    });
});