/*
contribute.js
Owen Gallagher
11 october 2019
*/

window.onload = function() {
	force_https()
	
	html_imports('navbar', '#import_navbar', function() {
		navbar_onload('contribute')
	})
	
	$('.form-check-copyright')
	.click(function() {
		close_unchecked($(this).attr('id'))
		$(this).addClass('text-copper').addClass('font-weight-bold')
		$('#focus_me').select()
	})
	
	html_imports('footer','#import_footer')
}

/*
ties details.open to input.checked
*/
function close_unchecked(details_id) {
	$('details:not(' + details_id + ').form-check-copyright')
	.prop('open',false)
	.removeClass('text-copper')
	.removeClass('font-weight-bold')
}
