'use strict';

let infraFirewallConfig = {
	permissions: {
		list: ['dashboard', '/infra', 'get'],
		removeFirewall: ['dashboard', '/infra/extra', 'delete'],
		addFirewall: ['dashboard', '/infra/extra', 'post'],
		editFirewall: ['dashboard', '/infra/extra', 'put']
	},

	form: {
		network: [
			{
				'name': 'name',
				'label': 'Name',
				'type': 'text',
				'value': "",
				'placeholder': 'My Template',
				'fieldMsg': 'Enter a name for your template',
				'required': true
			},
			{
				'name': 'description',
				'label': 'Description',
				'type': 'textarea',
				'value': "",
				'placeholder': 'My Template Description',
				'fieldMsg': 'Provide  a description for your template',
				'required': false
			},
			{
				'name': 'location',
				'label': 'Location',
				'type': 'select',
				'value': [],
				'fieldMsg': 'Select where to store this template.',
				'required': true
			}
		]
	},

	grid: {
		recordsPerPageArray: [5, 10, 50, 100],
		'columns': [
			{ 'label': 'Firewall Name', 'field': 'name' },
			{ 'label': 'Firewall Region', 'field': 'region' },
			{ 'label': 'Firewall Ports', 'field': 'ports' },
		],
		'leftActions': [],
		'topActions': [],
		'defaultSortField': '',
		'defaultLimit': 10
	},
};