<?php


$w =1;
$w =1;
$w =1;
$w =1;

switch ($_POST['type']) {
    case 'Info':
        if (!file_exists("upload/info/" . $_POST['fileName'] . ".json")) {
            $success = true;
            $state = 0;

            $unsentChucks = array();

            for ($i = 0; $i < (int)$_POST['chuckCount']; $i++) {
                $unsentChucks[] = $i;
            }

            $info = array(
                'basic' => array(
                    'fileName' => $_POST['fileName'],
                    'fileType' => $_POST['fileType'],
                    'fileSize' => (int)$_POST['fileSize'],
                    'chuckCount' => (int)$_POST['chuckCount']
                ),
                'unsent' => array(
                    'chuckCount' => (int)$_POST['chuckCount'],
                    'unsentChucks' => $unsentChucks
                )
            );

            file_put_contents("upload/info/" . $_POST['fileName'] . ".json", json_encode($info));
        }
        else {

            $success = true;
            $state = 1;
        }

        
        $response = array(
            'type' => 'Info',
            'success' => $success ? $success : false,
            'state' => $state
        );

        header("Content-Type: application/json");
        echo json_encode($response);

        break;
    
    case 'Confirm':
        $fileInfo = json_decode(file_get_contents("upload/info/".$_POST['fileName'].".json"), true);
        if ($fileInfo['unsent']['chuckCount'] > 0) {
            $success = false;
            $unsent = $fileInfo['unsent']['unsentChucks'];
        } else {
            $success = true;
            $unsent = null;
        }
        $response = array(
            'type' => 'Confirm',
            'success' => $success,
            'unsent' => $unsent
        );

        echo json_encode($response);
        
        break;

    case 'File':
        $fileInfo = json_decode(file_get_contents("upload/info/".$_POST['fileName'].".json"), true);
        $tempName = $_FILES['file']['tmp_name'];
        $name = "upload/files/".$_POST['number']."-".$fileInfo['basic']['fileName'];
        if (move_uploaded_file($tempName, $name)) {
            $index = array_search((int)$_POST['number'], $fileInfo['unsent']['unsentChucks']);
            unset($fileInfo['unsent']['unsentChucks'][$index]);
            $fileInfo['unsent']['chuckCount']--;
            file_put_contents("upload/info/".$_POST['fileName'].".json", json_encode($fileInfo));
        }

        break;

    default:
        break;
}