// Dedicated, self-contained modal for recording exam RESULTS in a fast,
// spreadsheet-like grid (see docs/ResultadoExames.md). Kept apart from the
// shared #addToRecords modal so this more complex flow stays isolated.

Template.examResultsModal.onRendered(function () {
  var template = this;
  var $modal = this.$('#examResultsModal');
  var $rows = this.$('#exam-results-rows');
  var $templateRow = this.$('#exam-result-template-row');

  // --- helpers ------------------------------------------------------------

  // gender + age-in-months for the patient, relative to the chosen exam date,
  // used to ask the catalog for the applicable reference rule
  function patientContext() {
    var patient = Patients.findOne(FlowRouter.getParam('_id')) || {};
    var dateStr = $modal.find('#exam-results-date').val();
    var ref = dateStr ? moment(dateStr, 'DD/MM/YYYY').toDate() : new Date();
    return {
      gender: patient.gender,
      ageMonths: ageInMonths(patient.dateOfBirth, ref)
    };
  }

  function addRow() {
    var $row = $templateRow.clone().removeAttr('id').removeAttr('style');
    $rows.append($row);
    $row.find('.exam-name-input').focus();
    return $row;
  }

  function resetModal() {
    $rows.empty();
    $modal.find('#exam-results-laboratory').val('');
    $modal.find('#exam-results-date').val(moment().format('DD/MM/YYYY'));
    addRow();
  }

  // green / red / neutral feedback on the Result cell (spec 3.2)
  function validateRow($row) {
    var $val = $row.find('.exam-value-input');
    var raw = $val.val();
    $val.css('border-color', '');
    $row.data('altered', false);
    if (raw === '' || raw === null) {
      return;
    }
    var num = parseFloat(String(raw).replace(',', '.'));
    if (isNaN(num)) {
      return; // non-numeric values (e.g. "Positivo") stay neutral
    }
    var min = $row.data('min');
    var max = $row.data('max');
    var hasMin = (min !== undefined && min !== null && min !== '');
    var hasMax = (max !== undefined && max !== null && max !== '');
    if (!hasMin && !hasMax) {
      return;
    }
    var altered = false;
    if (hasMin && hasMax) {
      altered = (num < min || num > max);
    } else if (hasMax) {
      altered = (num > max);
    } else if (hasMin) {
      altered = (num < min);
    }
    $val.css('border-color', altered ? '#dc3545' : '#198754');
    $row.data('altered', altered);
  }

  // fill reference + unit from a catalog match, or degrade gracefully (3.1)
  function selectExam($row, item, rule) {
    $row.find('.exam-name-input').val(item.name);
    $row.find('.exam-autocomplete-list').hide().empty();
    var $ref = $row.find('.exam-reference-input');
    $row.find('.exam-unit-input').val(item.unit || '');
    $row.removeData('min');
    $row.removeData('max');
    $row.data('matched', false);
    if (rule) {
      $ref.val(rule.displayText || '');
      $ref.prop('readonly', true).addClass('exam-reference-locked');
      if (rule.min !== undefined && rule.min !== null) { $row.data('min', rule.min); }
      if (rule.max !== undefined && rule.max !== null) { $row.data('max', rule.max); }
      $row.data('matched', true);
    } else {
      // no rule for this patient's age/gender: leave it editable to type later
      $ref.val('').prop('readonly', false).removeClass('exam-reference-locked');
    }
    // after picking an exam the doctor wants to type the value next
    $row.find('.exam-value-input').focus();
    validateRow($row);
  }

  // move the dropdown highlight up/down, wrapping around
  function moveHighlight($list, dir) {
    var $items = $list.children('li');
    if (!$items.length) { return; }
    var idx = $items.index($items.filter('.active'));
    idx = idx + dir;
    if (idx < 0) { idx = $items.length - 1; }
    if (idx >= $items.length) { idx = 0; }
    $items.removeClass('active');
    $items.eq(idx).addClass('active');
  }

  function collectRows() {
    var rows = [];
    $rows.children('tr').each(function () {
      var $row = $(this);
      var name = $.trim($row.find('.exam-name-input').val());
      if (!name) { return; }
      rows.push({
        examName: name,
        value: $.trim($row.find('.exam-value-input').val()),
        referenceUsed: $.trim($row.find('.exam-reference-input').val()),
        unit: $.trim($row.find('.exam-unit-input').val()),
        isAltered: !!$row.data('altered'),
        matched: !!$row.data('matched')
      });
    });
    return rows;
  }

  function save() {
    var rows = collectRows();
    if (rows.length === 0) {
      toastr['warning'](TAPi18n.__('exam-results_empty-warning'), TAPi18n.__('common_error'));
      return;
    }
    var dateStr = $modal.find('#exam-results-date').val();
    var doc = {
      laboratory: $.trim($modal.find('#exam-results-laboratory').val()),
      datePerformed: dateStr ? moment(dateStr, 'DD/MM/YYYY').toDate() : new Date(),
      results: rows
    };
    Meteor.call('savePatientExam', FlowRouter.getParam('_id'), doc, function (err, res) {
      if (err) {
        toastr['error'](err.reason || err.message, TAPi18n.__('common_error'));
        return;
      }
      toastr['success'](TAPi18n.__('common_save-success'), TAPi18n.__('common_success'));
      $modal.modal('hide');
    });
  }

  // --- wiring (delegated so cloned rows are covered) ----------------------

  $modal.on('show.bs.modal', resetModal);

  // Query the catalog and render suggestions for a row. An empty term is
  // allowed (server returns the most-used exams), so this also powers the
  // "press Down on an empty field to browse" affordance.
  function runSearch($row) {
    var $input = $row.find('.exam-name-input');
    var $list = $row.find('.exam-autocomplete-list');
    var term = $.trim($input.val());
    if (term.length > 64) { $list.hide().empty(); return; }
    var ctx = patientContext();
    Meteor.call('searchExamCatalog', term, ctx.gender, ctx.ageMonths, function (err, res) {
      $list.empty();
      if (err || !res || res.length === 0) { $list.hide(); return; }
      res.forEach(function (item, i) {
        var rule = (item.applicableRules && item.applicableRules[0]) || null;
        var $li = $('<li><a href="#"></a></li>');
        if (i === 0) { $li.addClass('active'); } // first ready for Tab/Enter
        $li.find('a').html(
          _.escape(item.name) +
          (item.unit ? ' <small class="text-muted">(' + _.escape(item.unit) + ')</small>' : '') +
          (rule && rule.displayText ? ' <span class="pull-right text-muted"><small>' + _.escape(rule.displayText) + '</small></span>' : '')
        );
        $li.data('item', item);
        $li.data('rule', rule);
        $list.append($li);
      });
      $list.show();
    });
  }

  // Field 1: live autocomplete against the catalog. Navigation keys are handled
  // in keydown below and must not retrigger a search (which would rebuild the
  // list and drop the current highlight).
  var NAV_KEYS = [9, 13, 27, 38, 40];
  $modal.on('keyup', '.exam-name-input', function (e) {
    if (NAV_KEYS.indexOf(e.which) !== -1) { return; }
    var $row = $(this).closest('tr');
    var $list = $row.find('.exam-autocomplete-list');
    var term = $.trim($(this).val());
    if (term.length < 1) { $list.hide().empty(); return; }
    runSearch($row);
  });

  // Field 1: keyboard navigation — arrows move the highlight, Tab/Enter pick
  // the highlighted suggestion (and the field auto-completes + jumps to Result)
  $modal.on('keydown', '.exam-name-input', function (e) {
    var $row = $(this).closest('tr');
    var $list = $row.find('.exam-autocomplete-list');
    var open = $list.is(':visible') && $list.children('li').length > 0;
    if (e.which === 40) { // down
      e.preventDefault();
      if (open) {
        moveHighlight($list, 1);
      } else {
        // open the suggestions even when the field is empty
        runSearch($row);
      }
    } else if (e.which === 38) { // up
      if (!open) { return; }
      e.preventDefault();
      moveHighlight($list, -1);
    } else if (e.which === 13 || e.which === 9) { // enter / tab
      if (!open) { return; } // let Tab/Enter behave normally when closed
      e.preventDefault();
      var $active = $list.children('li.active').first();
      if (!$active.length) { $active = $list.children('li').first(); }
      selectExam($row, $active.data('item'), $active.data('rule'));
    } else if (e.which === 27) { // esc
      $list.hide();
    }
  });

  // pick a suggestion (mousedown beats the input blur that hides the list)
  $modal.on('mousedown', '.exam-autocomplete-list li', function (e) {
    e.preventDefault();
    var $li = $(this);
    selectExam($li.closest('tr'), $li.data('item'), $li.data('rule'));
  });

  // keep the highlight in sync with the mouse
  $modal.on('mouseenter', '.exam-autocomplete-list li', function () {
    $(this).addClass('active').siblings().removeClass('active');
  });

  $modal.on('blur', '.exam-name-input', function () {
    var $list = $(this).closest('tr').find('.exam-autocomplete-list');
    setTimeout(function () { $list.hide(); }, 150);
  });

  // Field 2: real-time numeric validation
  $modal.on('input', '.exam-value-input', function () {
    validateRow($(this).closest('tr'));
  });

  // Field 4: TAB / ENTER grows the grid when on the last, filled row (3.3)
  $modal.on('keydown', '.exam-unit-input', function (e) {
    var isTab = (e.which === 9 && !e.shiftKey);
    var isEnter = (e.which === 13);
    if (!isTab && !isEnter) { return; }
    var $row = $(this).closest('tr');
    var isLast = $row.is(':last-child');
    var nameFilled = $.trim($row.find('.exam-name-input').val()) !== '';
    var valueFilled = $.trim($row.find('.exam-value-input').val()) !== '';
    if (isLast && nameFilled && valueFilled) {
      e.preventDefault();
      addRow();
    }
  });

  $modal.on('click', '.exam-row-remove', function () {
    var $row = $(this).closest('tr');
    if ($rows.children('tr').length > 1) {
      $row.remove();
    } else {
      $row.find('input').val('').css('border-color', '').prop('readonly', false).removeClass('exam-reference-locked');
      $row.removeData('min').removeData('max').removeData('matched').removeData('altered');
    }
  });

  $modal.on('click', '.exam-results-save', function () {
    save();
  });
});

Template.examResultsModal.onDestroyed(function () {
  this.$('#examResultsModal').off('show.bs.modal');
});
