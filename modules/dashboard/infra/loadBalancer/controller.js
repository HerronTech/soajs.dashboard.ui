"use strict";
var infraLoadBalancerApp = soajsApp.components;
infraLoadBalancerApp.controller('infraLoadBalancerCtrl', ['$scope', '$routeParams', '$localStorage', '$window', '$modal', '$timeout', '$cookies', 'injectFiles', 'ngDataApi', 'infraCommonSrv', 'infraLoadBalancerSrv', function ($scope, $routeParams, $localStorage, $window, $modal, $timeout, $cookies, injectFiles, ngDataApi, infraCommonSrv, infraLoadBalancerSrv) {
	$scope.$parent.isUserNameLoggedIn();
	$scope.showTemplateForm = false;

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, infraLoadBalancerConfig.permissions);

	infraCommonSrv.getInfraFromCookie($scope);

	$scope.$parent.$parent.switchInfra = function (oneInfra) {
		infraCommonSrv.switchInfra($scope, oneInfra, ["regions", "templates"], () => {
			if ($scope.$parent.$parent.currentSelectedInfra.groups && $scope.$parent.$parent.currentSelectedInfra.groups.length > 0) {
				//flag that infra doesn't have any resource groups
				$scope.noResourceGroups = false;
				$scope.infraGroups = $scope.$parent.$parent.currentSelectedInfra.groups;
				if($routeParams.group){
					$scope.infraGroups.forEach((oneInfraGroup) => {
						if(oneInfraGroup.name === $routeParams.group){
							$scope.selectedGroup = oneInfraGroup;
						}
					});
				}
				else{
					$scope.selectedGroup = $scope.infraGroups[0];
				}
				$timeout(() => {
					infraLoadBalancerSrv.listLoadBalancers($scope, $scope.selectedGroup);
				}, 500);
			}
			else if ($scope.$parent.$parent.currentSelectedInfra.groups && $scope.$parent.$parent.currentSelectedInfra.groups.length === 0) {
				$scope.noResourceGroups = true;
			}
		});
	};

	$scope.$parent.$parent.activateProvider = function () {
		infraCommonSrv.activateProvider($scope);
	};

	$scope.getProviders = function () {
		if($localStorage.infraProviders){
			$scope.$parent.$parent.infraProviders = angular.copy($localStorage.infraProviders);
			if(!$scope.$parent.$parent.currentSelectedInfra){
				$scope.go("/infra");
			}
			else{
				delete $scope.$parent.$parent.currentSelectedInfra.templates;
				$scope.$parent.$parent.switchInfra($scope.$parent.$parent.currentSelectedInfra);
			}
		}
		else{
			//list infras to build sidebar
			infraCommonSrv.getInfra($scope, {
				id: null,
				exclude: ["groups", "regions", "templates"]
			}, (error, infras) => {
				if (error) {
					$scope.displayAlert("danger", error);
				}
				else {
					$scope.infraProviders = infras;
					$localStorage.infraProviders = angular.copy($scope.infraProviders);
					$scope.$parent.$parent.infraProviders = angular.copy($scope.infraProviders);
					if(!$scope.$parent.$parent.currentSelectedInfra){
						$scope.go("/infra");
					}
					else{
						delete $scope.$parent.$parent.currentSelectedInfra.templates;
						$scope.$parent.$parent.switchInfra($scope.$parent.$parent.currentSelectedInfra);
					}
				}
			});
		}
	};

	$scope.deleteLoadBalancer = function (oneLoadBalancer) {
		infraLoadBalancerSrv.deleteLoadBalancer($scope, oneLoadBalancer);
	};

	$scope.addLoadBalancer = function () {
		infraLoadBalancerSrv.addLoadBalancer($scope);
	};

	$scope.editLoadBalancer = function (oneLoadBalancer) {
		infraLoadBalancerSrv.editLoadBalancer($scope, oneLoadBalancer);
	};

	$scope.listLoadBalancers = function (oneGroup) {
		infraLoadBalancerSrv.listLoadBalancers($scope, oneGroup);
	};

	if ($scope.access.list) {
		$scope.getProviders();
	}
	injectFiles.injectCss("modules/dashboard/infra/infra.css");
}]);