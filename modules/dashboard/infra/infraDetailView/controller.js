"use strict";
let infraACLConfig = soajsApp.components;
infraACLConfig.controller('infraConfigViewCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', '$routeParams', '$localStorage',
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
		
		$scope.getInfra = function () {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/infra/account/kubernetes/",
				"params": {
					id: $routeParams.id
				}
			}, function (error, response) {
				if (error) {
					$scope.displayAlert('danger', error.code, true, 'infra', error.message);
				} else {
					$scope.infra = response;
					if ($scope.infra.settings) {
						if ($scope.infra.settings.acl) {
							if ($scope.infra.settings.acl.groups) {
								$scope.showGroupButtonSlider = true;
								if ($scope.infra.settings.acl.groups.value) {
									$scope.groups.selectedGroups = $scope.infra.settings.acl.groups.value;
								}
								$scope.groups.groupType = $scope.infra.settings.acl.groups.type === "blacklist";
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
				"routeName": '/infra/account/kubernetes/acl',
				"data": {
					id: $scope.infra._id.toString(),
					type: $scope.groups.groupType ? 'blacklist' : "whitelist",
					groups: $scope.groups.selectedGroups
				}
			};
			getSendDataFromServer($scope, ngDataApi, opts, function (error) {
				if (error) {
					$scope.displayAlert('danger', error.code, true, 'infra', error.message);
				} else {
					$scope.$parent.displayAlert('success', "Acl updated Successfully for this infra provider");
					let user = $localStorage.soajs_user;
					let groups = user.groups;
					let found = groups.some((val) => opts.data.groups.indexOf(val) !== -1);
					console.log("found: " + found);
					if ((found && opts.data.type === "blacklist") || (!found && opts.data.type === "whitelist")) {
						$scope.$parent.go("/infra");
					}
				}
			});
		};
		
		$scope.deleteAcl = function () {
			let opts = {
				"method": "delete",
				"routeName": '/infra/account/kubernetes/acl',
				"params": {
					id: $scope.infra._id.toString()
				}
			};
			getSendDataFromServer($scope, ngDataApi, opts, function (error) {
				if (error) {
					$scope.displayAlert('danger', error.code, true, 'infra', error.message);
				} else {
					$scope.$parent.displayAlert('success', "Acl deleted Successfully for this infra provider");
					$scope.showGroupButtonSlider = false;
					$scope.groupsList.forEach((oneGroup) => {
						oneGroup.allowed = false;
					});
				}
			});
		};
		
		$scope.close = function () {
			$scope.$parent.go("#/infra", "_blank");
		};
		injectFiles.injectCss("modules/dashboard/infra/infraDetailView/infraAcl.css");
		$scope.getInfra();
		
	}]);
