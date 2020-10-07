<?php
$url = (isset($_GET['url'])) ? $_GET['url'] : false;
if(!$url) exit;

$type = (isset($_GET['type'])) ? $_GET['type'] : 'GET';

$referer = (isset($_SERVER['HTTP_REFERER'])) ? strtolower($_SERVER['HTTP_REFERER']) : false;
$is_allowed = $referer && strpos($referer, strtolower($_SERVER['SERVER_NAME'])) !== false; //deny abuse of your proxy from outside your site

if ($type=='POST') {
	$data1 = (isset($_GET['data'])) ? $_GET['data'] : false;

	$options = array(
		'http' => array(
			'header'  => "Content-type: application/json; charset=utf-8\r\n",
			'method'  => $type,
			'content' => json_encode($data1) //http_build_query($data)
		)
	);
	$context  = stream_context_create($options);

	if ($is_allowed) {
		$res = file_get_contents($url, false, $context);
		if ($res === FALSE) {
			$string = '{"resultCode":100, "message":"fail file_get_contents"}';
		} else {
			$string = $res; //utf8_encode($res);
		}
	} else {
		$string = '{"resultCode":100, "message":"You are not allowed to use this proxy!"}';
	}
} else {
	$string = ($is_allowed) ? file_get_contents($url) : '{"resultCode":100, "message":"You are not allowed to use this proxy!"}';
}

$json = json_encode($string);
$callback = (isset($_GET['callback'])) ? $_GET['callback'] : false;
if($callback){
	$jsonp = "$callback($json)";
	header('Content-Type: application/javascript');
	echo $jsonp;
	exit;
}
echo $json;