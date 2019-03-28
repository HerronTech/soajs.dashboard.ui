var apiBuilderConfig = {
	form: {
		addVersion :{
			'entries': [
				{
					'name': 'version',
					'label': 'Enter Version',
					'type': 'text',
					'value': '',
					'pattern': /^(\d+\.)?(\d+\.)?(\*|\d+)$/,
					'required': true,
					'placeholder': '1.0'
				}
			]
		}
	},
	permissions: {
		'listEndpoints': ['dashboard', '/apiBuilder/list', 'get'],
		
		'getEndpoints': ['dashboard', '/apiBuilder/get', 'get'],
		
		'editEndpoints': ['dashboard', '/apiBuilder/edit', 'put'],
		
		'getEndpointResources': ['dashboard', '/apiBuilder/getResources', 'get'],
		
		'addEndpoint': ['dashboard', '/apiBuilder/add', 'post'],
		
		'updateAPIAuthMethod': ['dashboard', '/apiBuilder/authentication/update', 'post'],
		
		'swaggertoIMFV': ['dashboard', '/apiBuilder/convertSwaggerToImfv', 'post'],
		
		'IMFVToSwagger': ['dashboard', '/apiBuilder/convertImfvToSwagger', 'post'],
		
		'updateEndpointSchema': ['dashboard', '/apiBuilder/updateSchemas', 'put'],
		
		'publish': ['dashboard', '/apiBuilder/publish', 'get'],
		
		'deleteEndpoint': ['dashboard', '/apiBuilder/delete', 'delete'],
		
		'generateService': ['dashboard', '/swagger/generate', 'post'],
		
		'regenerateService': ['dashboard', '/swagger/generateExistingService', 'post']
	}
};
