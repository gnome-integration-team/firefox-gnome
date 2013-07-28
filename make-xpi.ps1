$theme_files_path = $pwd.Path + "\theme"
$theme_files = (Get-ChildItem $theme_files_path)

[xml]$rdf = Get-Content ($theme_files_path+"\install.rdf")
$version = $rdf.RDF.Description.version

$path_to_zip = $pwd.Path + "\gnome-firefox-$version.zip"
$path_to_xpi = $pwd.Path + "\gnome-firefox-$version.xpi"

if ((test-path $path_to_xpi)) {
  Remove-Item -Path $path_to_xpi
}

if (-not (test-path $path_to_zip)) {
	New-Item -Path $path_to_zip -ItemType "file" | Out-Null
}

$ZipFile = (new-object -com shell.application).NameSpace($path_to_zip)

Get-ChildItem $theme_files_path | foreach {
	$file = ($theme_files_path+"\"+$_)
	if ((test-path $file)) {
		$zipfile.CopyHere($file)
		
		$isCompleted = $false
		while(!$isCompleted) {
			start-sleep -seconds 1
			Rename-Item $path_to_zip $path_to_xpi -ea 0
			if (Test-Path $path_to_xpi) {
				Rename-Item $path_to_xpi $path_to_zip -ea 0
				$isCompleted = $true
			}
		}
	}
}

Rename-Item $path_to_zip $path_to_xpi -ea 0
