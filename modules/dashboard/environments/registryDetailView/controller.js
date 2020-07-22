"use strict";
let registryConfig = soajsApp.components;
registryConfig.controller('registryConfigViewCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', '$routeParams', '$localStorage',
	function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, $routeParams, $localStorage) {
		$scope.$parent.isUserLoggedIn();
		
		$scope.groups = {
			groupType: false,
			selectedGroups: []
		};
		$scope.limit = 10;
		$scope.recipeSize = 10;
		
		$scope.getGroups = function () {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/urac/admin/groups",
			}, function (error, response) {
				if (error) {
					$scope.displayAlert('danger', error.code, true, 'urac', error.message);
				} else {
					$scope.groupsList = angular.copy(response);
					$scope.groupsList.forEach((oneGroup) => {
						if ($scope.groups.selectedGroups.indexOf(oneGroup.code) !== -1) {
							oneGroup.allowed = true;
						}
					});
				}
			});
		};
		
		$scope.getEnvironments = function () {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/console/environment/settings",
				"params": {
					code: $routeParams.code
				}
			}, function (error, response) {
				if (error) {
					$scope.displayAlert('danger', error.code, true, 'console', error.message);
				} else {
					$scope.env = response;
					if ($scope.env.settings) {
						if ($scope.env.settings.acl) {
							if ($scope.env.settings.acl.groups) {
								$scope.showGroupButtonSlider = true;
								if ($scope.env.settings.acl.groups.value) {
									$scope.groups.selectedGroups = $scope.env.settings.acl.groups.value;
								}
								$scope.groups.groupType = $scope.env.settings.acl.groups.type === "blacklist";
							}
						}
					}
					$scope.getGroups();
				}
			});
		};
		
		function removeA(arr) {
			var what, a = arguments, L = a.length, ax;
			while (L > 1 && arr.length) {
				what = a[--L];
				while ((ax = arr.indexOf(what)) !== -1) {
					arr.splice(ax, 1);
				}
			}
			return arr;
		}
		
		
		$scope.selectGroup = function (group) {
			$scope.showGroupButtonSlider = true;
			if (group.allowed) {
				removeA($scope.groups.selectedGroups, group.code);
				group.allowed = false;
			} else {
				group.allowed = true;
				$scope.groups.selectedGroups.push(group.code);
			}
		};
		
		$scope.saveACl = function () {
			let opts = {
				"method": "put",
				"routeName": '/console/environment/acl',
				"data": {
					code: $scope.env.code,
					type: $scope.groups.groupType ? 'blacklist' : "whitelist",
					groups: $scope.groups.selectedGroups
				}
			};
			getSendDataFromServer($scope, ngDataApi, opts, function (error) {
				if (error) {
					$scope.displayAlert('danger', error.code, true, 'console', error.message);
				} else {
					$scope.$parent.displayAlert('success', "Acl updated Successfully for this env");
					let user = $localStorage.soajs_user;
					let groups = user.groups;
					let found = groups.some((val) => opts.data.groups.indexOf(val) !== -1);
					console.log("found: " + found);
					if ((found && opts.data.type === "blacklist") || (!found && opts.data.type === "whitelist")) {
						$localStorage.environments = null;
						$scope.$parent.go("/environments-platforms");
					}
				}
			});
		};
		
		$scope.deleteAcl = function () {
			let opts = {
				"method": "delete",
				"routeName": '/console/environment/acl',
				"params": {
					code: $scope.env.code
				}
			};
			getSendDataFromServer($scope, ngDataApi, opts, function (error) {
				if (error) {
					$scope.displayAlert('danger', error.code, true, 'console', error.message);
				} else {
					$scope.$parent.displayAlert('success', "Acl deleted Successfully for this env");
					$scope.showGroupButtonSlider = false;
					$scope.groupsList.forEach((oneGroup) => {
						oneGroup.allowed = false;
					});
				}
			});
		};
		
		$scope.close = function () {
			$scope.$parent.go("#/environments-platforms", "_blank");
		};
		injectFiles.injectCss("modules/dashboard/environments/registryDetailView/registryAcl.css");
		$scope.getEnvironments();
		
	}]);
