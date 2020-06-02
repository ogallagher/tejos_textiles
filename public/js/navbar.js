/*

navbar.js
Owen Gallagher
4 May 2020

*/

function navbar_onload(page) {
	if (page) {
		//disable page nav button
		let navbtn = $('#nav_' + page)
		
		if (navbtn) {
			navbtn.removeClass('btn-outline-dark')
			navbtn.addClass('btn-dark').addClass('disabled')
		}
	}
	
	$('#nav_account_profile').click(function(event) {
		window.location.href = 'account.html'
	})
	
	$('#nav_account_logout').click(function(event) {
		let session_id = cookies_get(SESSION_COOKIE_KEY)
		
		if (session_id) {
			sessionclient_logout(session_id)
				.then(function() {
					//session deleted from server and client cookies; ready to re-enable login
					navbar_toggle_account(null)
					
					//pass execution to page to clean up evidence of user info
					if (login_on_logout) {
						login_on_logout()
					}
				})
		}
		else {
			//same as above, but session in the case that the session has already deleted (manually deleting cookies, deleting account, etc)
			navbar_toggle_account(null)
			if (login_on_logout) {
				login_on_logout()
			}
		}
	})
	
	//enable site search
	$('#navbar_search_input').on('keyup', function (e) {
        if (e.which === 13) { //13 = newline
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur()
            }
			
            navbar_search()
        }
    })
	
	$('#navbar_search_button').click(navbar_search)
}

/*
If the user is logged in, the account nav button links to the account.html page.
If the user is anonymous, the account nav button opens a modal component for handling login/register.
*/

function navbar_toggle_account(account) {
	let account_button = $('#nav_account')
	
	if (account == null) {
		console.log('enable login')
		
		//enable login/register form
		account_button.click(function(event) {
			$('#login_modal').modal('show')
		})
		
		//clear button name to ACCOUNT
		account_button.html('ACCOUNT')
		
		//disable account actions dropdown
		$('#nav_account_dropdown').addClass('d-none')
	}
	else {
		console.log('disable login')
		
		//disable login/register form
		account_button.unbind('click')
				
		//customize button name
		account_button.html(account.username)
		
		//enable account actions dropdown
		$('#nav_account_dropdown').removeClass('d-none')
	}
}

function navbar_search() {
    var search_val = $('#navbar_search_input').val().toString().toLowerCase();
    console.log('searching site for ' + search_val)
	
    if (search_val != '') {
        //send site search query
		dbclient_site_search(search_val.split(/[\s,]+/), function(data) {
			console.log(data)
			
			let result_str = '<a class="d-block clickable bg-slight-hover p-2 text-reset text-decoration-none" href></a>'
			
			let navbar_textiles = $('#navbar_textiles').empty()
			let tn = 0
			let navbar_accounts = $('#navbar_accounts').empty()
			let an = 0
			let navbar_works = $('#navbar_works').empty()
			let wn = 0
			
			for (let result of data) {
				switch (result.table) {
					case 'puzzles':
						navbar_textiles.append(
							$(result_str)
							.html(result.details)
							.prop('href','textile.html?puzzle_id=' + result.id)
						)
						tn++
						break
						
					case 'people':
						navbar_accounts.append(
							$(result_str)
							.html(result.id)
							.prop('href','account.html?username=' + result.id)
						)
						an++
						break
						
					case 'works':
						navbar_works.append(
							$(result_str)
							.html(result.id)
							.prop('href','account.html?username=' + result.details)
						)
						wn++
						break
				}	
			}
			
			$('#navbar_textiles_count').html(tn)
			$('#navbar_accounts_count').html(an)
			$('#navbar_works_count').html(wn)
			
			$('#navbar_search_results').show()
		})
    }
}