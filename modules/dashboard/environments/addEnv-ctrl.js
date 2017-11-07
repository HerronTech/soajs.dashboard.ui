"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('addEnvironmentCtrl', ['$scope', '$timeout', '$modal', '$cookies', 'ngDataApi', 'addEnv', 'injectFiles', '$localStorage', '$window', '$routeParams', function ($scope, $timeout, $modal, $cookies, ngDataApi, addEnv, injectFiles, $localStorage, $window, $routeParams) {
	
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);
	
	$scope.portalDeployment = false;
	
	$scope.wizard = {};
	
	//Check whether each part of the domain is not longer than 63 characters,
	//Allow internationalized domain names
	$scope.domainRegex= '^((?=[a-zA-Z0-9-]{1,63}\\.)(xn--)?[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*\\.)+[a-zA-Z]{2,63}$';
	
	$scope.Step1 = function () {
		overlayLoading.show();
		
		let entries = {
			code: {
				required: true,
				disabled: false,
				onAction : function(){
					if($scope.form && $scope.form.formData && $scope.form.formData.code === 'PORTAL'){
						$scope.portalDeployment = true;
						$scope.tempFormEntries.soajsFrmwrk.required = true;
						$scope.form.formData.soajsFrmwrk = true;
					}
				}
			},
			description: {
				required: true
			},
			domain: {
				required: true
			},
			apiPrefix: {
				required: false
			},
			sitePrefix: {
				required: false
			},
			tKeyPass: {
				required: true
			},
			soajsFrmwrk: {
				required: false,
				onAction: function () {
					
					if ($scope.form.formData.soajsFrmwrk) {
						entries.cookiesecret.required = true;
						entries.sessionName.required = true;
						entries.sessionSecret.required = true;
					}
					else {
						entries.cookiesecret.required = false;
						entries.sessionName.required = false;
						entries.sessionSecret.required = false;
					}
				}
			},
			cookiesecret: {
				required: false
			},
			sessionName: {
				required: false
			},
			sessionSecret: {
				required: false
			}
		};
		
		var configuration = angular.copy(environmentsConfig.form.add.step1.entries);
		$scope.tempFormEntries = entries;
		var options = {
			timeout: $timeout,
			entries: configuration,
			name: 'addEnvironment',
			label: translation.addNewEnvironment[LANG],
			actions: [
				{
					'type': 'submit',
					'label': "Next",
					'btn': 'primary',
					'action': function (formData) {
						
						//check mandatory fields
						for (let fieldName in $scope.tempFormEntries) {
							if ($scope.tempFormEntries[fieldName].required) {
								if (!formData[fieldName]) {
									$window.alert('Some of the fields under controller section are still missing.');
									return false;
								}
							}
						}
						
						if (formData.soajsFrmwrk) {
							if (!formData.cookiesecret || !formData.sessionName || !formData.sessionSecret) {
								$window.alert("If you want to use the SOAJS Framework, make sure you fill all of: cookie secret, session name & session secret");
								return false;
							}
						}
						
						if (!$localStorage.addEnv) {
							$localStorage.addEnv = {};
						}
						//todo: assert the inputs
						$localStorage.addEnv.step1 = angular.copy(formData);
						$scope.wizard.gi = angular.copy(formData);
						$scope.form.formData = {};
						$scope.lastStep = 1;
						
						$scope.Step2();
						
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						delete $localStorage.addEnv;
						$scope.form.formData = {};
						$scope.remoteCertificates = {};
						delete $scope.wizard;
						$scope.$parent.go("/environments")
					}
				}
			]
		};
		
		buildForm($scope, $modal, options, function () {
			if ($localStorage.addEnv && $localStorage.addEnv.step1) {
				$scope.form.formData = angular.copy($localStorage.addEnv.step1);
				$scope.wizard.gi = angular.copy($scope.form.formData);
				
				if($scope.wizard.gi.code === 'PORTAL'){
					$scope.portalDeployment = true;
				}
			}
			
			if($routeParams.portal){
				$scope.form.formData.code = 'PORTAL';
			}
			
			$scope.tempFormEntries.code.onAction();
			
			overlayLoading.hide();
		});
	};
	
	$scope.switchDriver = function (driver) {
		if (!$scope.platforms) {
			$scope.platforms = {
				manual: true,
				docker: false,
				kubernetes: false
			};
		}
		switch (driver) {
			case 'docker':
				$scope.platforms.docker = true;
				$scope.platforms.kubernetes = false;
				$scope.platforms.manual = false;
				break;
			case 'kubernetes':
				$scope.platforms.kubernetes = true;
				$scope.platforms.docker = false;
				$scope.platforms.manual = false;
				break;
			case 'manual':
			default:
				$scope.platforms.docker = false;
				$scope.platforms.kubernetes = false;
				$scope.platforms.manual = true;
				break;
		}
	};
	
	$scope.Step2 = function () {
		overlayLoading.show();
		var configuration = angular.copy(environmentsConfig.form.add.step2.entries);
		$scope.remoteCertificates ={};
		
		var options = {
			timeout: $timeout,
			entries: configuration,
			name: 'addEnvironment',
			label: translation.addNewEnvironment[LANG],
			actions: [
				{
					'type': 'button',
					'label': "Back",
					'btn': 'success',
					'action': function () {
						$scope.form.formData = {};
						$scope.Step1();
					}
				},
				{
					'type': 'submit',
					'label': "Next",
					'btn': 'primary',
					'action': function (formData) {
						if ($scope.platforms.manual) {
							formData.selectedDriver = 'manual';
							delete formData.kubernetes;
							delete formData.docker;
							$localStorage.addEnv.step2 = angular.copy(formData);
							$scope.wizard.deploy = angular.copy(formData);
							
							delete $scope.wizard.controller;
							delete $scope.wizard.nginx;
							
							$scope.lastStep = 2;
							$scope.overview();
						}
						else {
							if ($scope.platforms.docker) {
								delete formData.kubernetes;
								delete formData.deployment.kubernetes;
								formData.selectedDriver = 'docker';
								
								if (formData.deployment.docker.dockerremote) {
									if (!formData.deployment.docker.externalPort || !formData.deployment.docker.internalPort || !formData.deployment.docker.network) {
										$window.alert("Provide the information on how to connect to docker on your remote machine.");
										return false;
									}
									
									if (!$scope.remoteCertificates.ca || !$scope.remoteCertificates.cert || !$scope.remoteCertificates.key) {
										$window.alert("Docker requires you provide certificates so that the dashboard can connect to it securely. Please fill in the docker certificates.");
										return false;
									}
								}
								else {
									formData.deployment.docker = {
										dockerremote: false
									};
								}
							}
							if ($scope.platforms.kubernetes) {
								delete formData.docker;
								delete formData.deployment.docker;
								formData.selectedDriver = 'kubernetes';
								
								if (formData.deployment.kubernetes.kubernetesremote) {
									if (!formData.deployment.kubernetes.nginxDeployType || !formData.deployment.kubernetes.port || !formData.deployment.kubernetes.token || !formData.deployment.kubernetes.NS || !Object.hasOwnProperty.call(formData.deployment.kubernetes, 'perService')) {
										$window.alert("Provide the information on how to connect to kubernetes on your remote machine.");
										return false;
									}
								}
								else {
									formData.deployment.kubernetes = {
										kubernetesremote: false
									};
								}
							}
							
							$localStorage.addEnv.step2 = angular.copy(formData);
							$scope.wizard.deploy = angular.copy(formData);
							$scope.lastStep = 2;
							$scope.Step21();
						}
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						delete $localStorage.addEnv;
						$scope.form.formData = {};
						$scope.remoteCertificates = {};
						delete $scope.wizard;
						$scope.$parent.go("/environments")
					}
				}
			]
		};
		
		buildForm($scope, $modal, options, function () {
			if ($localStorage.addEnv && $localStorage.addEnv.step2) {
				$scope.form.formData = angular.copy($localStorage.addEnv.step2);
			}
			
			if (!$scope.form.formData.deployment) {
				$scope.form.formData.deployment = {};
			}
			
			if (!$scope.form.formData.deployment.docker) {
				$scope.form.formData.deployment.docker = {
					dockerremote: false
				};
			}
			
			if (!$scope.form.formData.deployment.kubernetes) {
				$scope.form.formData.deployment.kubernetes = {
					kubernetesremote: false
				};
			}
			
			$scope.platforms = {
				docker: $scope.form.formData.selectedDriver === 'docker' || false,
				kubernetes: $scope.form.formData.selectedDriver === 'kubernetes' || false,
				manual: $scope.form.formData.selectedDriver === 'manual' || false
			};
			overlayLoading.hide();
		});
	};
	
	$scope.Step21 = function () {
		//this only shows up iza el deployment is container w ya amma fi cluster ya amma create one for me
	};
	
	$scope.Step3 = function () {
		overlayLoading.show();
		$scope.serviceRecipes = [];
		$scope.currentServiceName = 'controller';
		getCatalogRecipes((recipes) => {
			getServiceBranches($scope.currentServiceName, (repoBranches) => {
				recipes.forEach((oneRecipe) => {
					if (oneRecipe.type === 'service' && oneRecipe.subtype === 'soajs') {
						$scope.serviceRecipes.push(oneRecipe);
					}
				});
				
				let entries = {
					mode: {
						required: true,
						onAction: function () {
							$scope.tempFormEntries.number.required = ['deployment', 'replicated'].indexOf($scope.form.formData.mode) !== -1;
						}
					},
					number: {
						required: false
					},
					memory: {
						required: true
					},
					catalog: {
						required: true,
						onAction: function () {
							//reset form entries
							delete $scope.form.formData.branch;
							delete $scope.form.formData.imagePrefix;
							delete $scope.form.formData.imageName;
							delete $scope.form.formData.imageTag;
							delete $scope.form.formData.custom;
							
							injectCatalogInputs($scope.serviceRecipes, repoBranches);
						}
					},
					branch: {
						required: true
					}
				};
				
				doBuildForm(entries, repoBranches);
			});
		});
		
		function doBuildForm(entries, controllerBranches) {
			var configuration = angular.copy(environmentsConfig.form.add.step3.entries);
			$scope.tempFormEntries = entries;
			var options = {
				timeout: $timeout,
				entries: configuration,
				name: 'addEnvironment',
				label: translation.addNewEnvironment[LANG],
				actions: [
					{
						'type': 'button',
						'label': "Back",
						'btn': 'success',
						'action': function () {
							$scope.form.formData = {};
							$scope.Step21();
						}
					},
					{
						'type': 'submit',
						'label': "Next",
						'btn': 'primary',
						'action': function (formData) {
							$scope.lastStep = 3;
							if (formData.deploy) {
								//check mandatory fields
								for (let fieldName in $scope.tempFormEntries) {
									if (fieldName === 'custom') {
										for (let env in $scope.tempFormEntries.custom) {
											if ($scope.tempFormEntries.custom[env].required) {
												if (!formData.custom[env].value) {
													$window.alert('Some of the fields under controller section are still missing.');
													return false;
												}
											}
										}
									}
									else if ($scope.tempFormEntries[fieldName].required) {
										if (!formData[fieldName]) {
											$window.alert('Some of the fields under controller section are still missing.');
											return false;
										}
									}
								}
								
								controllerBranches.branches.forEach((oneBranch) => {
									if (oneBranch.name === formData.branch && oneBranch.commit && oneBranch.commit.sha) {
										formData.commit = oneBranch.commit.sha;
									}
								});
								
								$localStorage.addEnv.step3 = angular.copy(formData);
								$scope.wizard.controller = angular.copy(formData);
								
								if($scope.portalDeployment){
									$scope.Step5();
								}
								else{
									$scope.Step4();
								}
							}
							else {
								$localStorage.addEnv.step3 = angular.copy(formData);
								$scope.wizard.controller = angular.copy(formData);
								$scope.overview();
							}
						}
					},
					{
						'type': 'reset',
						'label': translation.cancel[LANG],
						'btn': 'danger',
						'action': function () {
							delete $localStorage.addEnv;
							$scope.form.formData = {};
							$scope.remoteCertificates = {};
							delete $scope.wizard;
							$scope.$parent.go("/environments")
						}
					}
				]
			};
			
			buildForm($scope, $modal, options, function () {
				if ($localStorage.addEnv && $localStorage.addEnv.step3) {
					$scope.wizard.controller = angular.copy($localStorage.addEnv.step3);
					$scope.form.formData = $scope.wizard.controller;
				}
				
				if ($scope.wizard.deploy.selectedDriver === 'docker') {
					$scope.allowedModes = [
						{
							v: 'global',
							l: 'Global'
						},
						{
							v: 'replicated',
							l: 'Replicated'
						}
					];
				}
				else {
					$scope.allowedModes = [
						{
							v: 'daemonset',
							l: 'Daemonset'
						},
						{
							v: 'deployment',
							l: 'Deployment'
						}
					];
				}
				
				//if catalog recipe selected, open it's sub items
				if ($scope.wizard.controller && $scope.wizard.controller.catalog) {
					injectCatalogInputs($scope.serviceRecipes, controllerBranches);
				}
				overlayLoading.hide();
			});
		}
	};
	
	$scope.Step5 = function(){
		$scope.currentServiceName = "urac";
		$scope.currentStep = "step5";
		$scope.nextStep = "Step6";
		$scope.lastStep = 5;
		
		serviceDeployment();
	};
	
	$scope.Step6 = function(){
		$scope.currentServiceName = "oauth";
		$scope.currentStep = "step6";
		$scope.nextStep = "Step4";
		$scope.lastStep = 6;
		
		serviceDeployment();
	};
	
	function serviceDeployment(){
		overlayLoading.show();
		getServiceBranches($scope.currentServiceName, (repoBranches) => {
			let entries = {
				mode: {
					required: true,
					onAction: function () {
						$scope.tempFormEntries.number.required = ['deployment', 'replicated'].indexOf($scope.form.formData.mode) !== -1;
					}
				},
				number: {
					required: false
				},
				memory: {
					required: true
				},
				catalog: {
					required: true,
					onAction: function () {
						//reset form entries
						delete $scope.form.formData.branch;
						delete $scope.form.formData.imagePrefix;
						delete $scope.form.formData.imageName;
						delete $scope.form.formData.imageTag;
						delete $scope.form.formData.custom;
						
						injectCatalogInputs($scope.serviceRecipes, repoBranches);
					}
				},
				branch: {
					required: true
				}
			};
			
			doBuildForm(entries, repoBranches);
		});
		
		function doBuildForm(entries, repoBranches) {
			var configuration = angular.copy(environmentsConfig.form.add.step3.entries);
			$scope.tempFormEntries = entries;
			var options = {
				timeout: $timeout,
				entries: configuration,
				name: 'addEnvironment',
				label: translation.addNewEnvironment[LANG],
				actions: [
					{
						'type': 'button',
						'label': "Back",
						'btn': 'success',
						'action': function () {
							$scope.form.formData = {};
							let stepNumber = "Step" + $scope.lastStep;
							$scope[stepNumber]();
						}
					},
					{
						'type': 'submit',
						'label': "Next",
						'btn': 'primary',
						'action': function (formData) {
							//check mandatory fields
							for (let fieldName in $scope.tempFormEntries) {
								if (fieldName === 'custom') {
									for (let env in $scope.tempFormEntries.custom) {
										if ($scope.tempFormEntries.custom[env].required) {
											if (!formData.custom[env].value) {
												$window.alert('Some of the fields under ' + $scope.currentServiceName + ' section are still missing.');
												return false;
											}
										}
									}
								}
								else if ($scope.tempFormEntries[fieldName].required) {
									if (!formData[fieldName]) {
										$window.alert('Some of the fields under ' + $scope.currentServiceName + ' section are still missing.');
										return false;
									}
								}
							}
							
							repoBranches.branches.forEach((oneBranch) => {
								if (oneBranch.name === formData.branch && oneBranch.commit && oneBranch.commit.sha) {
									formData.commit = oneBranch.commit.sha;
								}
							});
							
							$localStorage.addEnv[$scope.currentStep] = angular.copy(formData);
							$scope.wizard[$scope.currentServiceName] = angular.copy(formData);
							
							$scope[$scope.nextStep]();
						}
					},
					{
						'type': 'reset',
						'label': translation.cancel[LANG],
						'btn': 'danger',
						'action': function () {
							delete $localStorage.addEnv;
							$scope.form.formData = {};
							$scope.remoteCertificates = {};
							delete $scope.wizard;
							$scope.$parent.go("/environments")
						}
					}
				]
			};
			
			buildForm($scope, $modal, options, function () {
				if ($localStorage.addEnv && $localStorage.addEnv[$scope.currentStep]) {
					$scope.wizard[$scope.currentServiceName] = angular.copy($localStorage.addEnv[$scope.currentStep]);
					$scope.form.formData = $scope.wizard[$scope.currentServiceName];
				}
				
				$scope.form.formData.deploy = true;
				
				if ($scope.wizard.deploy.selectedDriver === 'docker') {
					$scope.allowedModes = [
						{
							v: 'global',
							l: 'Global'
						},
						{
							v: 'replicated',
							l: 'Replicated'
						}
					];
				}
				else {
					$scope.allowedModes = [
						{
							v: 'daemonset',
							l: 'Daemonset'
						},
						{
							v: 'deployment',
							l: 'Deployment'
						}
					];
				}
				
				//if catalog recipe selected, open it's sub items
				if ($scope.wizard[$scope.currentServiceName] && $scope.wizard[$scope.currentServiceName].catalog) {
					injectCatalogInputs($scope.serviceRecipes, repoBranches);
				}
				overlayLoading.hide();
			});
		}
	}
	
	$scope.Step4 = function () {
		overlayLoading.show();
		$scope.nginxRecipes = [];
		
		getCatalogRecipes((recipes) => {
			recipes.forEach((oneRecipe) => {
				if (oneRecipe.type === 'server' && oneRecipe.subtype === 'nginx') {
					$scope.nginxRecipes.push(oneRecipe);
				}
			});
			
			let entries = {
				memory: {
					required: true
				},
				norecipe: {
					onAction: function () {
						if ($scope.form.formData.norecipe) {
							entries.http.required = true;
							entries.catalog.required = false;
						}
						else {
							entries.catalog.required = true;
							
							entries.http.required = false;
							entries.https.required = false;
							entries.ssl.required = false;
							entries.certs.required = false;
						}
					}
				},
				http: {
					required: false
				},
				https: {
					required: false
				},
				ssl: {
					required: false,
					onAction: function () {
						if ($scope.form.formData.ssl) {
							entries.https.required = true;
						}
						else {
							entries.https.required = false;
							entries.certs.required = false;
						}
					}
				},
				certs: {
					required: false
				},
				catalog: {
					required: true,
					onAction: function () {
						//reset form entries
						delete $scope.form.formData.branch;
						delete $scope.form.formData.imagePrefix;
						delete $scope.form.formData.imageName;
						delete $scope.form.formData.imageTag;
						delete $scope.form.formData.custom;
						
						injectCatalogInputs(recipes);
					}
				}
			};
			
			doBuildForm(entries);
		});
		
		function doBuildForm(entries) {
			var configuration = angular.copy(environmentsConfig.form.add.step4.entries);
			$scope.tempFormEntries = entries;
			var options = {
				timeout: $timeout,
				entries: configuration,
				name: 'addEnvironment',
				label: translation.addNewEnvironment[LANG],
				actions: [
					{
						'type': 'button',
						'label': "Back",
						'btn': 'success',
						'action': function () {
							$scope.form.formData = {};
							if($scope.wizard.urac && $scope.wizard.oauth){
								$scope.lastStep = 6;
							}
							else{
								$scope.lastStep = 3;
							}
							let stepNumber = "Step" + $scope.lastStep;
							$scope[stepNumber]();
						}
					},
					{
						'type': 'submit',
						'label': "Next",
						'btn': 'primary',
						'action': function (formData) {
							$scope.lastStep = 4;
							if (formData.deploy) {
								//check mandatory fields
								for (let fieldName in $scope.tempFormEntries) {
									if (fieldName === 'custom') {
										for (let env in $scope.tempFormEntries.custom) {
											if ($scope.tempFormEntries.custom[env].required) {
												if (!formData.custom[env].value) {
													$window.alert('Some of the fields are still missing.');
													return false;
												}
											}
										}
									}
									else if (fieldName === 'certs') {
										if (formData.certs) {
											if (!formData.certsGit || !formData.certsGit.domain || !formData.certsGit.owner || !formData.certsGit.repo || !formData.certsGit.branch || !formData.certsGit.token) {
												$window.alert('Some of the fields are still missing.');
												return false;
											}
										}
									}
									else if ($scope.tempFormEntries[fieldName].required) {
										if (!formData[fieldName]) {
											$window.alert('Some of the fields are still missing.');
											return false;
										}
									}
								}
								
								if (formData.norecipe) {
									delete formData.imageName;
									delete formData.imagePrefix;
									delete formData.imageTag;
									delete formData.custom;
									delete formData.catalog;
								}
								else {
									delete formData.certs;
									delete formData.certsGit;
									delete formData.customUi;
									delete formData.http;
									delete formData.https;
									delete formData.ssl;
								}
								
								$localStorage.addEnv.step4 = angular.copy(formData);
								$scope.wizard.nginx = angular.copy(formData);
							}
							$scope.overview();
						}
					},
					{
						'type': 'reset',
						'label': translation.cancel[LANG],
						'btn': 'danger',
						'action': function () {
							delete $localStorage.addEnv;
							$scope.form.formData = {};
							$scope.remoteCertificates = {};
							delete $scope.wizard;
							$scope.$parent.go("/environments")
						}
					}
				]
			};
			
			buildForm($scope, $modal, options, function () {
				if ($localStorage.addEnv && $localStorage.addEnv.step4) {
					$scope.wizard.nginx = angular.copy($localStorage.addEnv.step4);
					$scope.form.formData = $scope.wizard.nginx;
				}
				
				$scope.supportSSL = false;
				if($scope.wizard.deploy && $scope.wizard.deploy.deployment){
					if(($scope.wizard.deploy.deployment.docker && $scope.wizard.deploy.deployment.docker.dockerremote) || ($scope.wizard.deploy.deployment.kubernetes && $scope.wizard.deploy.deployment.kubernetes.kubernetesremote)){
						$scope.supportSSL = true;
					}
				}
				
				if ($scope.wizard.controller) {
					$scope.form.formData.deploy = $scope.wizard.controller.deploy;
				}
				
				if ($scope.wizard.deploy.selectedDriver === 'docker') {
					$scope.form.formData.mode = 'global';
				}
				else {
					$scope.form.formData.mode = 'daemonset';
				}
				
				if ($scope.form.formData.norecipe) {
					$scope.tempFormEntries.http.required = true;
					$scope.tempFormEntries.catalog.required = false;
				}
				else {
					$scope.tempFormEntries.catalog.required = true;
					
					$scope.tempFormEntries.http.required = false;
					$scope.tempFormEntries.https.required = false;
					$scope.tempFormEntries.ssl.required = false;
					$scope.tempFormEntries.certs.required = false;
				}
				
				//if catalog recipe selected, open it's sub items
				if ($scope.wizard.nginx && $scope.wizard.nginx.catalog) {
					injectCatalogInputs($scope.nginxRecipes);
				}
				overlayLoading.hide();
			});
		}
	};
	
	$scope.overview = function () {
		var configuration = angular.copy(environmentsConfig.form.add.overview.entries);
		var options = {
			timeout: $timeout,
			entries: configuration,
			name: 'addEnvironment',
			label: translation.addNewEnvironment[LANG],
			actions: [
				{
					'type': 'button',
					'label': "Back",
					'btn': 'success',
					'action': function () {
						$scope.form.formData = {};
						//got back to last step !
						let stepNumber = "Step" + $scope.lastStep;
						$scope[stepNumber]();
					}
				},
				{
					'type': 'submit',
					'label': "Create Environment",
					'btn': 'primary',
					'action': function (formData) {
						/*
							1- create environment record in db
							2- if controller.deploy = true
								2.1- deploy controller
								2.2- wait for controllers to become available
								2.3- if recipe already exists --> deploy nginx
								2.4- if no recipe
									2.4.1- create recipe
									2.4.2- deploy nginx using recipe
						 */
						let parentScope = $scope;
						$modal.open({
							templateUrl: "progressAddEnv.tmpl",
							size: 'm',
							backdrop: true,
							keyboard: false,
							controller: function($scope, $modalInstance){
								$scope.progressCounter = 0;
								$scope.maxCounter = 3;
								if (parentScope.portalDeployment) {
									$scope.maxCounter++;
								}
								if (parentScope.wizard.controller && parentScope.wizard.controller.deploy) {
									$scope.maxCounter++;
									if (!parentScope.wizard.nginx.catalog) {
										$scope.maxCounter++;
									}
								}
								
								addEnvironment (function(){
									$timeout(function () {
										finalResponse();
									}, 2000);
								});
								
								function addEnvironment(cb) {
									addEnv.createEnvironment(parentScope, (error, response) => {
										if (error) {
											rollback([], error);
										}
										else {
											parentScope.envId = response.data;
											$scope.progressCounter++;
											$scope.createEnvironment = true;
											addEnv.uploadEnvCertificates(parentScope, (error) => {
												if (error) {
													rollback([{method: 'removeEnvironment'}], error);
												}
												else if (parentScope.portalDeployment) {
													$scope.progressCounter++;
													$scope.uploadEnvCertificates = true;
													productize((error) => {
														if(error){
															rollback([{method: 'removeEnvironment'}, {method: 'removeProduct'}], error);
														}
														else{
															$scope.progressCounter++;
															$scope.productize = true;
															handleDeployment(cb);
														}
													});
												}
												else {
													$scope.progressCounter++;
													$scope.uploadEnvCertificates = true;
													handleDeployment(cb);
												}
											});
										}
									});
								}
								
								function productize(cb){
									addEnv.productize(parentScope, parentScope.wizard, cb);
								}
								
								function handleDeployment(cb){
									let steps = [{method: 'removeEnvironment'}];
									if(parentScope.portalDeployment){
										steps.push({method: 'removeProduct'});
									}
									if (parentScope.wizard.controller && parentScope.wizard.controller.deploy) {
										addEnv.deployController(parentScope, (error, controllerId) => {
											if(error){
												rollback(steps, error);
											}
											else{
												$scope.controllerId = controllerId;
												$scope.progressCounter++;
												$scope.deployController = true;
												if($scope.portalDeployment){
													addEnv.deployUrac(parentScope, (error, uracId) => {
														if(error){
															steps.push({method: 'removeController', id: $scope.controllerId});
															rollback(steps, error);
														}
														else{
															$scope.uracId = uracId;
															$scope.progressCounter++;
															$scope.deployUrac = true;
															
															addEnv.deployOauth(parentScope, (error, oAuthId) => {
																if(error){
																	steps.push({method: 'removeController', id: $scope.controllerId});
																	steps.push({method: 'removeUrac', id: $scope.uracId});
																	rollback(steps, error);
																}
																else{
																	$scope.oAuthId = oAuthId;
																	$scope.progressCounter++;
																	$scope.deployOauth = true;
																	handleNginx(steps, (error) => {
																		//add user and group using new tenant
																		addUserAndGroup( (error) => {
																			if(error){
																				steps.push({method: 'removeController', id: $scope.controllerId});
																				steps.push({method: 'removeUrac', id: $scope.uracId});
																				steps.push({method: 'removeOauth', id: $scope.oAuthId});
																				steps.push({method: 'removeCatalog', id: $scope.catalogId});
																				steps.push({method: 'removeNginx', id: $scope.nginxId});
																				rollback(steps, error);
																			}
																			else{
																				return cb();
																			}
																		});
																	});
																}
															});
														}
													});
												}
												else{
													handleNginx(steps, cb);
												}
											}
										});
									}
									else {
										$scope.progressCounter++;
										return cb();
									}
								}
								
								function handleNginx(steps, cb){
									if (parentScope.wizard.nginx.catalog) {
										addEnv.deployNginx(parentScope, parentScope.wizard.nginx.catalog, (error, nginxId) => {
											if(error){
												steps.push({method: 'removeController', id: $scope.controllerId});
												if($scope.portalDeployment){
													steps.push({method: 'removeUrac', id: $scope.uracId});
													steps.push({method: 'removeOauth', id: $scope.oAuthId});
												}
												rollback(steps, error);
											}
											else {
												$scope.nginxId = nginxId;
												$scope.progressCounter++;
												$scope.deployNginx = true;
												return cb();
											}
										});
									}
									else {
										addEnv.createNginxRecipe(parentScope, (error, catalogId) => {
											if(error){
												steps.push({method: 'removeController', id: $scope.controllerId});
												if($scope.portalDeployment){
													steps.push({method: 'removeUrac', id: $scope.uracId});
													steps.push({method: 'removeOauth', id: $scope.oAuthId});
												}
												rollback(steps, error);
											}
											else {
												$scope.catalogId = catalogId;
												$scope.progressCounter++;
												$scope.createNginxRecipe = true;
												addEnv.deployNginx(parentScope, catalogId, (error, nginxId) => {
													if(error){
														steps.push({method: 'removeController', id: $scope.controllerId});
														if($scope.portalDeployment){
															steps.push({method: 'removeUrac', id: $scope.uracId});
															steps.push({method: 'removeOauth', id: $scope.oAuthId});
														}
														steps.push({method: 'removeCatalog', id: catalogId});
														rollback(steps, error);
													}
													else {
														$scope.nginxId = nginxId;
														$scope.progressCounter++;
														$scope.deployNginx = true;
														return cb();
													}
												});
											}
										});
									}
								}
								
								function addUserAndGroup(cb){
									getSendDataFromServer($scope, ngDataApi, {
										method: 'post',
										proxy: true,
										routeName: '/urac/admin/group/add',
										header: {
											key: $scope.tenantExtKey
										},
										data: {
											"name":"administrator",
											"code":"administrator",
											"description":"Portal administration group",
											"tId": $scope.tenantId,
											"tCode":"PRTL"
										}
									}, function (error) {
										if (error) {
											return cb(error);
										}
										else {
											getSendDataFromServer($scope, ngDataApi, {
												method: 'post',
												proxy: true,
												routeName: '/urac/admin/addUser',
												header: {
													key: $scope.tenantExtKey
												},
												data: {
													"username": $scope.wizard.gi.username,
													"firstName":"PORTAL",
													"lastName":"OWNER",
													"email": $scope.wizard.gi.email,
													"groups":["administrator"],
													"tId":$scope.tenantId,
													"tCode":"PRTL",
													"status": "active",
													"password": $scope.wizard.gi.password
												}
											}, cb);
										}
									});
								}
								
								function rollback(steps, error){
									
									//steps cases
									//['environment']
									//['environment', 'product']
									//['environment', 'controller']
									//['environment', 'product', 'controller']
									//['environment', 'controller', 'catalog']
									//['environment', 'product', 'controller', 'catalog']
									if(steps && typeof Array.isArray(steps)){
										steps.forEach((oneStep) => {
											if(oneStep.id){
												addEnv[oneStep.method](parentScope, oneStep.id);
											}
											else{
												addEnv[oneStep.method](parentScope);
											}
										});
									}
									$modalInstance.close();
									overlayLoading.hide();
									parentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
								}
								
								function finalResponse(){
									addEnv.getPermissions(parentScope, () => {
										$modalInstance.close();
										delete $localStorage.addEnv;
										parentScope.form.formData = {};
										parentScope.remoteCertificates = {};
										delete parentScope.wizard;
										parentScope.displayAlert('success', "Environment Created");
										parentScope.$parent.go("#/environments");
									});
								}
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						delete $localStorage.addEnv;
						$scope.form.formData = {};
						$scope.remoteCertificates = {};
						delete $scope.wizard;
						$scope.$parent.go("/environments")
					}
				}
			]
		};
		buildForm($scope, $modal, options, function () {});
	};
	
	function getCatalogRecipes(cb) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/catalog/recipes/list'
		}, function (error, recipes) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				return cb(recipes);
			}
		});
	}
	
	function getServiceBranches(serviceName, cb) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/gitAccounts/getBranches',
			params: {
				name: serviceName,
				type: 'service'
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				return cb(response);
			}
		});
	}
	
	function injectCatalogInputs(recipes, serviceBranches) {
		let entries = $scope.tempFormEntries;
		let chosenRecipe = $scope.form.formData.catalog;
		
		//append the custom catalog inputs
		recipes.forEach(function (oneRecipe) {
			if (oneRecipe._id === chosenRecipe) {
				
				delete entries.branches;
				if (oneRecipe.recipe.deployOptions.specifyGitConfiguration) {
					entries.branches = serviceBranches.branches;
				}
				
				delete entries.imagePrefix;
				delete entries.imageName;
				delete entries.imageTag;
				if (oneRecipe.recipe.deployOptions.image.override) {
					//append images
					if (!$scope.form.formData.imagePrefix) {
						$scope.form.formData.imagePrefix = oneRecipe.recipe.deployOptions.image.prefix;
					}
					entries.imagePrefix = {
						required: true
					};
					if (!$scope.form.formData.imageName) {
						$scope.form.formData.imageName = oneRecipe.recipe.deployOptions.image.name;
					}
					entries.imageName = {
						required: true
					};
					if (!$scope.form.formData.imageTag) {
						$scope.form.formData.imageTag = oneRecipe.recipe.deployOptions.image.tag;
					}
					entries.imageTag = {
						required: false
					};
				}
				
				delete entries.custom;
				//append inputs whose type is userInput
				for (var envVariable in oneRecipe.recipe.buildOptions.env) {
					if (oneRecipe.recipe.buildOptions.env[envVariable].type === 'userInput') {
						
						//push a new input for this variable
						var newInput = {
							'name': envVariable,
							'label': oneRecipe.recipe.buildOptions.env[envVariable].label || envVariable,
							'type': 'text',
							'value': oneRecipe.recipe.buildOptions.env[envVariable].default || '',
							'fieldMsg': oneRecipe.recipe.buildOptions.env[envVariable].fieldMsg
						};
						
						if (!oneRecipe.recipe.buildOptions.env[envVariable].default || oneRecipe.recipe.buildOptions.env[envVariable].default === '') {
							newInput.required = true;
						}
						
						if (!$scope.form.formData.custom) {
							$scope.form.formData.custom = {};
						}
						
						if (!$scope.form.formData.custom[envVariable]) {
							$scope.form.formData.custom[envVariable] = newInput;
						}
						
						if (!entries.custom) {
							entries.custom = {};
						}
						
						entries.custom[envVariable] = {
							name: newInput.name,
							label: newInput.label,
							value: newInput.value,
							type: newInput.type,
							fieldMsg: newInput.fieldMsg,
							required: true
						};
					}
				}
			}
		});
	}
	
	if ($scope.access.addEnvironment) {
		$scope.Step1();
	}
	
	injectFiles.injectCss('modules/dashboard/environments/environments.css');
}]);